import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated, authStorage } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { requireRole, requireOrgAccess, ensureOrgMembership, bootstrapUserOrganization, OrgMembershipInfo } from "./rbac";
import { 
  insertDropSchema, 
  insertBrochureSchema, 
  insertReminderSchema, 
  updateUserPreferencesSchema, 
  ORG_MEMBER_ROLES, 
  insertOrganizationMemberSchema,
  insertMerchantSchema,
  insertReferralSchema,
  insertFollowUpSequenceSchema,
  insertFollowUpStepSchema,
  insertActivityEventSchema,
  REFERRAL_STATUSES,
  LEAD_TIERS,
  insertInvitationSchema,
  insertFeedbackSubmissionSchema,
  INVITATION_STATUSES,
  insertDealSchema,
  insertDealActivitySchema,
  insertDealAttachmentSchema,
  PipelineStage,
  PIPELINE_STAGES,
  deals,
  dealActivities,
  organizations,
  organizationMembers,
  merchants,
} from "@shared/schema";
import { db } from "./db";
import { sendInvitationEmail, sendFeedbackEmail, generateInviteToken, sendThankYouEmail, sendMeetingRecordingEmail, sendRoleplaySessionEmail } from "./email";
import { insertMeetingRecordingSchema } from "@shared/schema";
import { exportReferrals, exportDrops, exportMerchants, ExportFormat } from "./export";
import {
  getBusinessRiskProfile,
  UNDERWRITING_AI_CONTEXT,
  generateAgentSuggestions,
  checkProhibitedBusiness,
} from "./underwriting";
import { getEmailPrompt, PCBANCARD_SALES_SCRIPT } from "./sales-script";
import {
  SALES_TRAINING_KNOWLEDGE,
  getBusinessContextPrompt,
  getScenarioPrompt,
  getCoachingHint,
  ROLEPLAY_PERSONAS,
  buildDailyEdgeCoachingContext,
  buildEnhancedFeedbackPrompt,
  getEnhancedCoachingHint,
  mapDifficultyLevel,
  PSYCHOGRAPHIC_TYPES,
  EMOTIONAL_DRIVERS,
  TONAL_TECHNIQUES,
  QUICK_REFERENCE,
} from "./roleplay-knowledge";
import { 
  insertRoleplaySessionSchema, 
  ROLEPLAY_SCENARIOS,
  insertDailyEdgeContentSchema,
  DAILY_EDGE_BELIEFS,
  DAILY_EDGE_CONTENT_TYPES,
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import OpenAI from "openai";
import { 
  presentationPracticeResponses, 
  presentationProgress, 
  presentationLessons,
  prospects,
  prospectActivities,
  prospectSearches,
  drops,
  videoWatchProgress,
  equipmentQuizResults,
  dailyEdgeStreaks,
  gamificationProfiles,
  badgesEarned,
} from "@shared/schema";
import { eq, and, desc, ilike, or, asc, lte, gte, count, sql } from "drizzle-orm";
import { 
  listCoachingDocuments, 
  getAllCoachingContent, 
  buildDriveKnowledgeContext,
  isDriveConnected,
  syncDriveToDatabase 
} from "./google-drive";
import { seedDailyEdgeContent } from "./daily-edge-seed";
import { seedEquipIQData } from "./equipiq-seed";
import { seedPresentationData } from "./presentation-seed";
import { seedRoleplayPersonas } from "./seed-roleplay-personas";
import { getMerchantCache, formatDuration, CacheCategory } from "./services/cache-service";
import { paginate, paginateByStage, normalizeDealParams, decodeCursor, DealPaginationParams, KanbanPaginationParams } from "./services/pagination";
import { getDuplicateDetector, type Prospect as DuplicateProspect, type DuplicateCheckResult } from "./services/duplicate-detection";
import { seedDemoDeals, deleteDemoDeals, checkDemoDealsExist } from "./seed-demo-data";
import { researchBusiness } from "./business-research";
import { extractBusinessCardData } from "./services/business-card-scanner";
import { generateProposalImages, type ProposalImages } from "./proposal-images";
import { createProposalJob, executeProposalJob, getProposalJobStatus } from "./proposal-builder";
import { scrapeMerchantWebsite, fetchLogoAsBase64 } from "./merchant-scrape";
import proposalIntelligenceRouter from "./proposal-intelligence/api";
import { textToSpeech, speechToText } from "./elevenlabs";
import { searchLocalBusinesses } from "./services/prospect-search";
import { analyzeStatement, type StatementData } from "./proposal-intelligence/services/statement-analysis";
import { generateTalkingPoints } from "./proposal-intelligence/services/talking-points";
import { extractStatementFromFiles } from "./proposal-intelligence/services/statement-extractor";
import webpush from "web-push";
import fs from "fs";
import path from "path";
import { validateAndSanitize, getDefaultSanitizedData } from "./services/statement-validator";
import { awardXP, getGamificationProfile, getLeaderboard, checkBadgeProgression, XP_CONFIG, LEVEL_THRESHOLDS, BADGE_DEFINITIONS, BADGE_LEVELS, getLevelInfo, generateVerificationCode } from "./gamification-engine";
import { generateCertificatePDF, checkCertificateEligibility, CERTIFICATE_TYPES } from "./certificate-generator";
import { generateAllAssets, getAssetManifest, resolveAssetPath } from "./certificate-asset-generator";
import { getTrainingKnowledgeForRoleplay } from "./training-knowledge-context";

// Internal secret for background job processing
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'prospect-job-internal-key-' + Date.now();

// Configure multer for file uploads (in-memory storage for audio files)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    // Only allow audio files (including iOS Safari variants and fallbacks)
    const allowedMimeTypes = [
      "audio/wav",
      "audio/mpeg",
      "audio/mp4",
      "audio/webm",
      "audio/m4a",
      "audio/x-m4a",
      "audio/aac",
      "audio/ogg",
      "audio/flac",
      "video/webm",
      "video/mp4",
      "audio/mp4a-latm",      // iOS Safari AAC variant
      "audio/3gpp",           // Mobile device format
      "audio/3gpp2",          // Mobile device format
      "application/octet-stream", // Fallback when browser doesn't set proper MIME
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(", ")}`));
    }
  },
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (OpenAI Whisper limit)
  },
});

// OpenAI client will be initialized lazily when needed
let openai: OpenAI | null = null;
let openaiAIIntegrations: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

function getAIIntegrationsClient(): OpenAI {
  if (!openaiAIIntegrations) {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    if (!apiKey || !baseURL) {
      throw new Error("AI Integrations not configured");
    }
    openaiAIIntegrations = new OpenAI({ apiKey, baseURL });
  }
  return openaiAIIntegrations;
}

/**
 * Get the effective user ID - returns the impersonated user ID if a valid
 * impersonation session exists, otherwise returns the original user ID.
 */
async function getEffectiveUserId(req: any): Promise<string> {
  const originalUserId = req.user?.claims?.sub;
  if (!originalUserId) return originalUserId;
  
  const impersonationToken = req.headers["x-impersonation-token"] as string;
  if (!impersonationToken) return originalUserId;
  
  try {
    const session = await storage.getImpersonationSessionByToken(impersonationToken);
    // Check session exists, is active (status === "active"), and not expired
    if (session && session.status === "active" && new Date(session.expiresAt) > new Date()) {
      // Verify the original user is the one who started the impersonation
      if (session.originalUserId === originalUserId) {
        console.log(`[Impersonation] Returning impersonated user: ${session.impersonatedUserId} (original: ${originalUserId})`);
        return session.impersonatedUserId;
      } else {
        console.log(`[Impersonation] Token mismatch: session original ${session.originalUserId} != request original ${originalUserId}`);
      }
    } else if (session) {
      console.log(`[Impersonation] Session invalid: status=${session.status}, expired=${new Date(session.expiresAt) <= new Date()}`);
    } else {
      console.log(`[Impersonation] No session found for token`);
    }
  } catch (error) {
    console.error("Error checking impersonation session:", error);
  }
  
  return originalUserId;
}

/**
 * Get the original user ID (for audit purposes), bypassing impersonation.
 */
function getOriginalUserId(req: any): string {
  return req.user?.claims?.sub;
}

/**
 * Get the effective membership - returns the impersonated user's membership if 
 * a valid impersonation session exists, otherwise returns the original membership.
 */
async function getEffectiveMembership(req: any): Promise<OrgMembershipInfo | null> {
  const effectiveUserId = await getEffectiveUserId(req);
  const membership = await storage.getUserMembership(effectiveUserId);
  return membership || null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication first
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Setup object storage routes
  registerObjectStorageRoutes(app);

  // Setup Proposal Intelligence API routes
  app.use("/api/proposal-intelligence", proposalIntelligenceRouter);

  // Seed Daily Edge content if not already present
  seedDailyEdgeContent().catch((error) => {
    console.error("Failed to seed Daily Edge content:", error);
  });

  // Seed Presentation Training content if not already present
  seedPresentationData().catch((error) => {
    console.error("Failed to seed Presentation Training content:", error);
  });

  // Brochures API
  app.post("/api/brochures", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const parsed = insertBrochureSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      const brochure = await storage.createBrochure(parsed.data);
      res.status(201).json(brochure);
    } catch (error) {
      console.error("Error creating brochure:", error);
      res.status(500).json({ error: "Failed to create brochure" });
    }
  });

  // IMPORTANT: Specific brochure routes must come BEFORE /api/brochures/:id
  // Get house inventory (unassigned brochures)
  app.get("/api/brochures/house", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const brochures = await storage.getHouseInventory(membership.organization.id);
      res.json(brochures);
    } catch (error) {
      console.error("Error fetching house inventory:", error);
      res.status(500).json({ error: "Failed to fetch house inventory" });
    }
  });

  // Get all brochures with locations for the organization
  app.get("/api/brochures/locations", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const brochures = await storage.getBrochuresWithLocations(membership.organization.id);
      res.json(brochures);
    } catch (error) {
      console.error("Error fetching brochure locations:", error);
      res.status(500).json({ error: "Failed to fetch brochure locations" });
    }
  });

  // Get my brochures (for current user)
  app.get("/api/brochures/my-inventory", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      const membership = await getEffectiveMembership(req) || req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      
      const holderType = role === "relationship_manager" ? "relationship_manager" : "agent";
      const brochures = await storage.getBrochuresByHolder(
        membership.organization.id,
        holderType,
        userId
      );
      res.json(brochures);
    } catch (error) {
      console.error("Error fetching my brochures:", error);
      res.status(500).json({ error: "Failed to fetch your brochures" });
    }
  });

  // Get team members for assignment dropdown
  app.get("/api/brochures/assignees", isAuthenticated, requireRole("master_admin", "relationship_manager"), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const members = await storage.getOrganizationMembers(membership.organization.id);
      
      // Filter to RMs and agents only
      const assignees = members
        .filter(m => ["relationship_manager", "agent"].includes(m.role))
        .map(m => ({
          id: m.userId,
          memberId: m.id,
          role: m.role,
        }));
      
      res.json(assignees);
    } catch (error) {
      console.error("Error fetching assignees:", error);
      res.status(500).json({ error: "Failed to fetch assignees" });
    }
  });

  app.get("/api/brochures/:id", isAuthenticated, async (req, res) => {
    try {
      const brochure = await storage.getBrochure(req.params.id);
      if (!brochure) {
        return res.status(404).json({ error: "Brochure not found" });
      }
      res.json(brochure);
    } catch (error) {
      console.error("Error fetching brochure:", error);
      res.status(500).json({ error: "Failed to fetch brochure" });
    }
  });

  // Check business for prohibited types endpoint
  app.post("/api/check-business", isAuthenticated, async (req: any, res) => {
    try {
      const { businessName, notes } = req.body;
      
      if (!businessName || typeof businessName !== "string") {
        return res.status(400).json({ error: "businessName is required" });
      }
      
      const result = checkProhibitedBusiness(businessName, notes || "");
      
      res.json({
        isProhibited: result.isProhibited,
        isWarning: result.isWarning,
        matches: result.matches.map(m => ({
          name: m.name,
          reason: m.reason,
          warningOnly: (m as any).warningOnly || false,
        })),
      });
    } catch (error) {
      console.error("Error checking business:", error);
      res.status(500).json({ error: "Failed to check business" });
    }
  });

  // Drops API
  app.get("/api/drops", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      let drops = await storage.getDropsByAgent(userId);
      
      // Seed demo data for new users with no drops
      if (drops.length === 0) {
        console.log(`Seeding demo data for new user: ${userId}`);
        // Get or create user's organization membership for demo data
        let membership = await storage.getUserMembership(userId);
        const orgId = membership?.organization?.id || null;
        await storage.seedDemoData(userId, orgId);
        drops = await storage.getDropsByAgent(userId);
      }
      
      res.json(drops);
    } catch (error) {
      console.error("Error fetching drops:", error);
      res.status(500).json({ error: "Failed to fetch drops" });
    }
  });

  // Export drops - MUST be before /api/drops/:id to avoid route conflict
  app.get("/api/drops/export", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      const format = (req.query.format as ExportFormat) || "csv";
      const status = req.query.status as string | undefined;
      const scope = req.query.scope as string | undefined; // company, rm, agent
      const rmId = req.query.rmId as string | undefined;
      const agentId = req.query.agentId as string | undefined;
      
      if (!["csv", "xlsx"].includes(format)) {
        return res.status(400).json({ error: "Invalid format. Use 'csv' or 'xlsx'" });
      }
      
      let drops: any[] = [];
      const membership = req.orgMembership as OrgMembershipInfo;
      const isAdmin = membership.role === "master_admin";
      
      // Handle different export scopes (admin only)
      if (scope && isAdmin) {
        const orgId = membership.organization.id;
        
        if (scope === "company") {
          // Export all drops for the organization
          const allMembers = await storage.getOrganizationMembers(orgId);
          const allAgentIds = allMembers.map(m => m.userId);
          drops = await storage.getDropsByOrganization(allAgentIds);
        } else if (scope === "rm" && rmId) {
          // Export drops for an RM and their team
          const allMembers = await storage.getOrganizationMembers(orgId);
          const rmMember = allMembers.find(m => m.userId === rmId);
          if (!rmMember) {
            return res.status(404).json({ error: "RM not found" });
          }
          // Verify the selected member is actually an RM or admin
          if (rmMember.role !== "relationship_manager" && rmMember.role !== "master_admin") {
            return res.status(400).json({ error: "Selected user is not a Relationship Manager" });
          }
          // Get RM's own drops
          const rmDrops = await storage.getDropsByAgent(rmId);
          // Get all agents managed by this RM
          const managedAgents = allMembers.filter(m => m.managerId === rmMember.id);
          // Get drops from all managed agents
          const agentDropsArrays = await Promise.all(
            managedAgents.map(agent => storage.getDropsByAgent(agent.userId))
          );
          drops = [...rmDrops, ...agentDropsArrays.flat()];
        } else if (scope === "agent" && agentId) {
          // Export drops for a specific agent - verify they're in this org
          const allMembers = await storage.getOrganizationMembers(orgId);
          const agentMember = allMembers.find(m => m.userId === agentId);
          if (!agentMember) {
            return res.status(404).json({ error: "Agent not found in organization" });
          }
          drops = await storage.getDropsByAgent(agentId);
        } else {
          return res.status(400).json({ error: "Invalid scope or missing parameters" });
        }
      } else {
        // Default: export current user's drops only
        drops = await storage.getDropsByAgent(userId);
      }
      
      if (status && status !== "all") {
        drops = drops.filter(d => d.status === status);
      }
      
      const filename = `drops_export_${new Date().toISOString().split("T")[0]}`;
      const buffer = await exportDrops(drops, { format, filename });
      
      const contentType = format === "csv" 
        ? "text/csv; charset=utf-8"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const extension = format === "csv" ? "csv" : "xlsx";
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.${extension}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting drops:", error);
      res.status(500).json({ error: "Failed to export drops" });
    }
  });

  app.get("/api/drops/:id", isAuthenticated, async (req: any, res) => {
    try {
      const dropId = parseInt(req.params.id);
      if (isNaN(dropId)) {
        return res.status(400).json({ error: "Invalid drop ID" });
      }
      
      const drop = await storage.getDrop(dropId);
      if (!drop) {
        return res.status(404).json({ error: "Drop not found" });
      }
      
      // Ensure user owns this drop
      const userId = await getEffectiveUserId(req);
      if (drop.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(drop);
    } catch (error) {
      console.error("Error fetching drop:", error);
      res.status(500).json({ error: "Failed to fetch drop" });
    }
  });

  app.post("/api/drops", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      
      // Get orgId from middleware
      const orgId = req.orgMembership?.organization?.id || null;
      
      // Handle brochure ID - use provided one or generate a manual entry ID
      let brochureId = req.body.brochureId;
      if (!brochureId || brochureId.trim() === "") {
        // Generate a unique ID for manual entries without QR code
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        brochureId = `MANUAL-${timestamp}-${randomPart}`;
      }
      
      // Check if brochure exists, create if not
      let brochure = await storage.getBrochure(brochureId);
      
      if (!brochure) {
        // Auto-create brochure if it doesn't exist
        brochure = await storage.createBrochure({
          id: brochureId,
          status: "deployed",
          orgId: orgId,
        });
      } else {
        // Update brochure status to deployed
        await storage.updateBrochureStatus(brochureId, "deployed");
      }
      
      // Check brochure custody - warn if not assigned to this agent
      let custodyWarning: { message: string; currentHolder?: string } | null = null;
      const brochureLocation = await storage.getBrochureLocation(brochureId);
      
      if (brochureLocation) {
        // Brochure is tracked - verify custody
        if (brochureLocation.holderType === "house") {
          custodyWarning = {
            message: "This brochure is in house inventory and not assigned to you. It has been marked as deployed.",
            currentHolder: "House Inventory"
          };
        } else if (brochureLocation.holderId !== userId) {
          custodyWarning = {
            message: "This brochure is assigned to someone else. It has been marked as deployed under your name.",
            currentHolder: brochureLocation.holderType === "relationship_manager" ? "A Relationship Manager" : "Another Agent"
          };
        }
        
        // Update custody to reflect deployment
        try {
          await storage.transferBrochure(
            brochureId,
            "agent",
            userId,
            userId,
            "deploy",
            `Deployed to merchant: ${req.body.businessName || 'Unknown'}`
          );
        } catch (e) {
          console.log("Could not update brochure custody:", e);
        }
      } else if (orgId) {
        // Brochure not tracked yet - auto-register and assign to agent
        try {
          await storage.registerBrochure(brochureId, orgId, userId, "Auto-registered during deployment");
          await storage.transferBrochure(
            brochureId,
            "agent",
            userId,
            userId,
            "deploy",
            `Deployed to merchant: ${req.body.businessName || 'Unknown'}`
          );
        } catch (e) {
          console.log("Could not auto-register brochure:", e);
        }
      }
      
      // Check for prohibited business types
      const businessName = req.body.businessName || "";
      const textNotes = req.body.textNotes || "";
      const prohibitedCheck = checkProhibitedBusiness(businessName, textNotes);
      
      if (prohibitedCheck.isProhibited) {
        return res.status(400).json({
          error: "Prohibited business type",
          prohibited: true,
          reason: prohibitedCheck.matches[0].reason,
          businessType: prohibitedCheck.matches[0].name,
        });
      }
      
      // Create the drop with validation
      const dropData = {
        ...req.body,
        brochureId: brochureId,
        agentId: userId,
        orgId: orgId,
        status: req.body.status || "pending",
      };
      
      const parsed = insertDropSchema.safeParse(dropData);
      if (!parsed.success) {
        const errors = parsed.error.errors.map(e => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return res.status(400).json({ 
          error: "Validation failed",
          details: errors 
        });
      }
      
      let drop = await storage.createDrop(parsed.data);
      
      // Auto-create or link to merchant if businessName is provided
      if (drop.businessName && orgId) {
        try {
          let merchant = await storage.getMerchantByBusinessName(orgId, drop.businessName);
          
          if (!merchant) {
            // Create new merchant as prospect
            merchant = await storage.createMerchant({
              orgId: orgId,
              businessName: drop.businessName,
              businessType: drop.businessType || undefined,
              businessPhone: drop.businessPhone || undefined,
              contactName: drop.contactName || undefined,
              address: drop.address || undefined,
              latitude: drop.latitude || undefined,
              longitude: drop.longitude || undefined,
              status: "prospect",
              createdBy: userId,
            });
          }
          
          // Link drop to merchant and update merchant stats
          drop = (await storage.updateDrop(drop.id, { merchantId: merchant.id })) || drop;
          await storage.updateMerchant(merchant.id, {
            totalDrops: (merchant.totalDrops || 0) + 1,
            lastVisitAt: new Date(),
          });
          
          // Auto-create deal in pipeline if not already exists for this merchant
          const existingDeals = await storage.getDealsByMerchantId(merchant.id);
          if (existingDeals.length === 0) {
            // Create a new deal in prospect stage (can be configured via drop.pipelineStage)
            const initialStage = (drop as any).pipelineStage || "prospect";
            const deal = await storage.createDeal({
              organizationId: orgId,
              businessName: merchant.businessName,
              businessAddress: merchant.address || undefined,
              businessPhone: merchant.businessPhone || undefined,
              contactName: merchant.contactName || undefined,
              businessType: merchant.businessType || undefined,
              merchantId: merchant.id,
              currentStage: initialStage,
              temperature: "warm",
              assignedAgentId: userId,
              sourceType: "brochure_drop",
              sourceDetails: `Brochure drop ID: ${drop.id}`,
            });
            
            // Create activity for the deal
            await storage.createDealActivity({
              dealId: deal.id,
              activityType: "brochure_drop",
              description: `Brochure dropped at location. Brochure ID: ${drop.brochureId || 'N/A'}`,
              performedBy: userId,
            });
          } else {
            // Add brochure drop activity to existing deal
            await storage.createDealActivity({
              dealId: existingDeals[0].id,
              activityType: "brochure_drop",
              description: `Additional brochure dropped. Brochure ID: ${drop.brochureId || 'N/A'}`,
              performedBy: userId,
            });
          }
        } catch (e) {
          console.error("Error linking drop to merchant:", e);
        }
      }
      
      // Create a reminder for the pickup
      if (drop.pickupScheduledFor) {
        await storage.createReminder({
          dropId: drop.id,
          agentId: userId,
          remindAt: new Date(drop.pickupScheduledFor),
          method: "push",
        });
      }
      
      // Include warning flags if needed
      const response: any = { ...drop };
      if (prohibitedCheck.isWarning) {
        response.warning = {
          message: "This business type requires additional documentation and review",
          matches: prohibitedCheck.matches.map(m => ({
            name: m.name,
            reason: m.reason,
          })),
        };
      }
      
      // Include custody warning if brochure was not properly assigned
      if (custodyWarning) {
        response.custodyWarning = custodyWarning;
      }
      
      res.status(201).json(response);
    } catch (error) {
      console.error("Error creating drop:", error);
      res.status(500).json({ error: "Failed to create drop" });
    }
  });

  // Offline sync endpoint - create drops that were saved offline
  app.post("/api/offline/sync", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get orgId from middleware
      const orgId = req.orgMembership?.organization?.id || null;
      
      // Handle brochure ID - use provided one or generate a manual entry ID
      let brochureId = req.body.brochureId;
      if (!brochureId || brochureId.trim() === "") {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        brochureId = `OFFLINE-${timestamp}-${randomPart}`;
      }
      
      // Check if brochure exists, create if not
      let brochure = await storage.getBrochure(brochureId);
      
      if (!brochure) {
        brochure = await storage.createBrochure({
          id: brochureId,
          status: "deployed",
          orgId: orgId,
        });
      } else {
        await storage.updateBrochureStatus(brochureId, "deployed");
      }
      
      // Create the drop with validation
      const dropData = {
        ...req.body,
        brochureId: brochureId,
        agentId: userId,
        orgId: orgId,
        status: req.body.status || "pending",
      };
      
      const parsed = insertDropSchema.safeParse(dropData);
      if (!parsed.success) {
        const errors = parsed.error.errors.map(e => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return res.status(400).json({ 
          error: "Validation failed",
          details: errors 
        });
      }
      
      const drop = await storage.createDrop(parsed.data);
      
      // Create a reminder for the pickup
      if (drop.pickupScheduledFor) {
        await storage.createReminder({
          dropId: drop.id,
          agentId: userId,
          remindAt: new Date(drop.pickupScheduledFor),
          method: "push",
        });
      }
      
      res.status(201).json({ 
        success: true, 
        drop,
        syncedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error syncing offline drop:", error);
      res.status(500).json({ error: "Failed to sync offline drop" });
    }
  });

  app.patch("/api/drops/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const dropId = parseInt(req.params.id);
      if (isNaN(dropId)) {
        return res.status(400).json({ error: "Invalid drop ID" });
      }
      
      const existingDrop = await storage.getDrop(dropId);
      if (!existingDrop) {
        return res.status(404).json({ error: "Drop not found" });
      }
      
      // Ensure user owns this drop
      const userId = req.user.claims.sub;
      if (existingDrop.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updateData: Record<string, any> = {};
      
      // Validate status if provided
      if (req.body.status !== undefined) {
        const statusValidation = z.enum(["pending", "picked_up", "converted", "lost"]).safeParse(req.body.status);
        if (!statusValidation.success) {
          return res.status(400).json({ 
            error: "Validation failed",
            details: [{ 
              field: "status", 
              message: "Status must be one of: pending, picked_up, converted, lost" 
            }]
          });
        }
        updateData.status = req.body.status;
      }
      
      // Validate outcome if provided
      if (req.body.outcome !== undefined) {
        const outcomeValidation = z.enum([
          "signed",
          "interested_appointment",
          "interested_later",
          "not_interested",
          "closed",
          "not_found"
        ]).optional().nullable().safeParse(req.body.outcome);
        if (!outcomeValidation.success) {
          return res.status(400).json({ 
            error: "Validation failed",
            details: [{ 
              field: "outcome", 
              message: "Outcome must be one of: signed, interested_appointment, interested_later, not_interested, closed, not_found" 
            }]
          });
        }
        updateData.outcome = req.body.outcome;
      }
      
      if (req.body.outcomeNotes !== undefined) {
        updateData.outcomeNotes = req.body.outcomeNotes;
      }
      
      if (req.body.status === "picked_up" || req.body.status === "converted") {
        updateData.pickedUpAt = new Date();
      }
      
      // Handle editable business info fields
      if (req.body.businessName !== undefined) {
        if (typeof req.body.businessName !== "string") {
          return res.status(400).json({ 
            error: "Validation failed",
            details: [{ field: "businessName", message: "Business name must be a string" }]
          });
        }
        updateData.businessName = req.body.businessName;
      }
      
      if (req.body.businessType !== undefined) {
        const validTypes = ["restaurant", "retail", "service", "convenience", "auto", "medical", "salon", "other"];
        if (req.body.businessType !== null && !validTypes.includes(req.body.businessType)) {
          return res.status(400).json({ 
            error: "Validation failed",
            details: [{ field: "businessType", message: `Business type must be one of: ${validTypes.join(", ")}` }]
          });
        }
        updateData.businessType = req.body.businessType;
      }
      
      if (req.body.businessPhone !== undefined) {
        updateData.businessPhone = req.body.businessPhone;
      }
      
      if (req.body.contactName !== undefined) {
        updateData.contactName = req.body.contactName;
      }
      
      // Handle location fields
      if (req.body.address !== undefined) {
        updateData.address = req.body.address;
      }
      
      if (req.body.latitude !== undefined) {
        if (req.body.latitude !== null && (typeof req.body.latitude !== "number" || isNaN(req.body.latitude))) {
          return res.status(400).json({ 
            error: "Validation failed",
            details: [{ field: "latitude", message: "Latitude must be a valid number" }]
          });
        }
        updateData.latitude = req.body.latitude;
      }
      
      if (req.body.longitude !== undefined) {
        if (req.body.longitude !== null && (typeof req.body.longitude !== "number" || isNaN(req.body.longitude))) {
          return res.status(400).json({ 
            error: "Validation failed",
            details: [{ field: "longitude", message: "Longitude must be a valid number" }]
          });
        }
        updateData.longitude = req.body.longitude;
      }
      
      // Handle notes fields
      if (req.body.textNotes !== undefined) {
        updateData.textNotes = req.body.textNotes;
      }
      
      if (req.body.voiceTranscript !== undefined) {
        updateData.voiceTranscript = req.body.voiceTranscript;
      }
      
      if (req.body.pickupScheduledFor !== undefined) {
        if (req.body.pickupScheduledFor === null) {
          updateData.pickupScheduledFor = null;
        } else {
          const dateValidation = z.union([z.date(), z.string()]).pipe(
            z.coerce.date().refine(
              (date) => date > new Date(),
              { message: "Pickup date must be in the future" }
            )
          ).safeParse(req.body.pickupScheduledFor);
          if (!dateValidation.success) {
            return res.status(400).json({ 
              error: "Validation failed",
              details: [{ 
                field: "pickupScheduledFor", 
                message: "Pickup date must be a valid future date" 
              }]
            });
          }
          updateData.pickupScheduledFor = dateValidation.data;
        }
      }
      
      const updated = await storage.updateDrop(dropId, updateData);
      
      // Update brochure status if drop is picked up
      if (updateData.status === "picked_up" || updateData.status === "converted") {
        await storage.updateBrochureStatus(existingDrop.brochureId, "returned");
      }
      
      // Auto-create merchant in Merchants list when drop is converted (signed)
      // Verify org access before merchant creation - prevent cross-tenant data leakage
      const membership = req.orgMembership as OrgMembershipInfo;
      if (updated && updateData.status === "converted" && req.body.outcome === "signed" && existingDrop.orgId && existingDrop.orgId === membership.orgId) {
        try {
          // Check if merchant already exists for this business
          const existingMerchant = await storage.getMerchantByBusinessName(
            existingDrop.orgId,
            updated.businessName || existingDrop.businessName || "Unknown Business"
          );
          
          if (existingMerchant) {
            // Update existing merchant with conversion info
            await storage.updateMerchant(existingMerchant.id, {
              status: "converted",
              totalConversions: (existingMerchant.totalConversions || 0) + 1,
              lastVisitAt: new Date(),
              contactName: updated.contactName || existingMerchant.contactName,
              businessPhone: updated.businessPhone || existingMerchant.businessPhone,
              address: updated.address || existingMerchant.address,
              latitude: updated.latitude || existingMerchant.latitude,
              longitude: updated.longitude || existingMerchant.longitude,
            });
          } else {
            // Create new merchant from drop data (already converted)
            await storage.createMerchant({
              orgId: existingDrop.orgId,
              businessName: updated.businessName || existingDrop.businessName || "Unknown Business",
              businessType: updated.businessType || existingDrop.businessType || null,
              contactName: updated.contactName || existingDrop.contactName || null,
              businessPhone: updated.businessPhone || existingDrop.businessPhone || null,
              address: updated.address || existingDrop.address || null,
              latitude: updated.latitude || existingDrop.latitude || null,
              longitude: updated.longitude || existingDrop.longitude || null,
              notes: updated.textNotes || existingDrop.textNotes || null,
              status: "converted",
              lastVisitAt: new Date(),
              createdBy: userId,
            });
          }
        } catch (merchantError) {
          // Log but don't fail the drop update if merchant creation fails
          console.error("Error auto-creating merchant from converted drop:", merchantError);
        }
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating drop:", error);
      res.status(500).json({ error: "Failed to update drop" });
    }
  });

  // DELETE /api/drops/:id - Delete a drop with role-based permissions
  app.delete("/api/drops/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const dropId = parseInt(req.params.id);
      if (isNaN(dropId)) {
        return res.status(400).json({ error: "Invalid drop ID" });
      }
      
      const existingDrop = await storage.getDrop(dropId);
      if (!existingDrop) {
        return res.status(404).json({ error: "Drop not found" });
      }
      
      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;
      
      // Ensure drop belongs to this org
      if (existingDrop.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Role-based delete permissions:
      // - master_admin: can delete any drop in org
      // - relationship_manager: can delete own + managed agents' drops
      // - agent: can delete own drops only
      let canDelete = false;
      
      if (role === "master_admin") {
        canDelete = true;
      } else if (role === "relationship_manager") {
        // Check if drop belongs to this manager or one of their managed agents
        if (existingDrop.agentId === userId) {
          canDelete = true;
        } else {
          // Get managed agents
          const allMembers = await storage.getOrganizationMembers(orgId);
          const rmMember = allMembers.find(m => m.userId === userId);
          if (rmMember) {
            const managedAgentIds = allMembers
              .filter(m => m.managerId === rmMember.id)
              .map(m => m.userId);
            if (managedAgentIds.includes(existingDrop.agentId)) {
              canDelete = true;
            }
          }
        }
      } else {
        // Agent can only delete own drops
        canDelete = existingDrop.agentId === userId;
      }
      
      if (!canDelete) {
        return res.status(403).json({ error: "You don't have permission to delete this drop" });
      }
      
      await storage.deleteDrop(dropId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting drop:", error);
      res.status(500).json({ error: "Failed to delete drop" });
    }
  });

  // Reminders API
  app.get("/api/drops/:dropId/reminders", isAuthenticated, async (req: any, res) => {
    try {
      const dropId = parseInt(req.params.dropId);
      if (isNaN(dropId)) {
        return res.status(400).json({ error: "Invalid drop ID" });
      }
      
      const reminders = await storage.getRemindersByDrop(dropId);
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ error: "Failed to fetch reminders" });
    }
  });

  app.post("/api/drops/:dropId/reminders", isAuthenticated, async (req: any, res) => {
    try {
      const dropId = parseInt(req.params.dropId);
      const userId = req.user.claims.sub;
      
      if (isNaN(dropId)) {
        return res.status(400).json({ error: "Invalid drop ID" });
      }
      
      const reminderData = {
        ...req.body,
        dropId,
        agentId: userId,
        remindAt: new Date(req.body.remindAt),
      };
      
      const parsed = insertReminderSchema.safeParse(reminderData);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      const reminder = await storage.createReminder(parsed.data);
      res.status(201).json(reminder);
    } catch (error) {
      console.error("Error creating reminder:", error);
      res.status(500).json({ error: "Failed to create reminder" });
    }
  });

  // Voice transcription endpoint using Gemini AI
  app.post(
    "/api/transcribe",
    isAuthenticated,
    ensureOrgMembership(),
    upload.single("audio"),
    async (req: any, res) => {
      try {
        // Verify file was uploaded
        if (!req.file) {
          return res.status(400).json({ 
            error: "No audio file provided",
            details: [{ field: "audio", message: "Audio file is required" }]
          });
        }

        // Verify Gemini AI integrations is configured
        const hasGeminiIntegrations = process.env.AI_INTEGRATIONS_GEMINI_API_KEY && process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
        
        if (!hasGeminiIntegrations) {
          console.error("No Gemini API key configured for transcription");
          return res.status(500).json({ 
            error: "Audio transcription service is not available",
            details: [{ 
              field: "server", 
              message: "Gemini API is not configured" 
            }]
          });
        }

        const mimeType = req.file.mimetype || "audio/webm";
        console.log(`Transcription: received ${req.file.size} bytes, mime: ${mimeType}`);
        
        // Convert audio buffer to base64
        const audioBase64 = req.file.buffer.toString("base64");
        
        // Use Gemini for audio transcription
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({
          apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
          httpOptions: {
            apiVersion: "",
            baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
          },
        });
        
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: audioBase64,
                  },
                },
                {
                  text: "Please transcribe this audio recording. Return ONLY the exact words spoken, without any additional commentary, timestamps, or formatting. If no speech is detected, return an empty string.",
                },
              ],
            },
          ],
        });

        const transcription = response.text || "";
        console.log(`Transcription successful: ${transcription.substring(0, 50)}...`);
        
        res.json({
          text: transcription.trim(),
        });
      } catch (error: any) {
        console.error("Error transcribing audio:", error?.message || error);
        res.status(500).json({ 
          error: "Failed to transcribe audio",
          details: [{ 
            field: "audio", 
            message: error instanceof Error ? error.message : "Unknown error occurred during transcription" 
          }]
        });
      }
    }
  );

  // Meeting Recordings API - for sales coaching repository
  app.post("/api/meeting-recordings", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;
      
      const parsed = insertMeetingRecordingSchema.safeParse({
        ...req.body,
        agentId: userId,
        orgId: membership.orgId,
      });
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      const recording = await storage.createMeetingRecording(parsed.data);
      res.json(recording);
    } catch (error) {
      console.error("Error creating meeting recording:", error);
      res.status(500).json({ error: "Failed to create meeting recording" });
    }
  });

  app.get("/api/meeting-recordings", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;
      
      // Admins/RMs see all org recordings, agents see only their own
      const isAdmin = membership.role === "master_admin" || membership.role === "relationship_manager";
      
      let recordings;
      if (isAdmin) {
        recordings = await storage.getMeetingRecordingsByOrg(membership.orgId);
      } else {
        recordings = await storage.getMeetingRecordingsByAgent(userId);
      }
      
      res.json(recordings);
    } catch (error) {
      console.error("Error fetching meeting recordings:", error);
      res.status(500).json({ error: "Failed to fetch meeting recordings" });
    }
  });

  app.get("/api/meeting-recordings/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid recording ID" });
      }
      
      const recording = await storage.getMeetingRecording(id);
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }
      
      // Verify org access
      if (recording.orgId !== membership.orgId) {
        return res.status(404).json({ error: "Recording not found" });
      }
      
      res.json(recording);
    } catch (error) {
      console.error("Error fetching meeting recording:", error);
      res.status(500).json({ error: "Failed to fetch meeting recording" });
    }
  });

  // Analyze and complete a meeting recording - summarizes and emails to office
  app.post(
    "/api/meeting-recordings/:id/complete",
    isAuthenticated,
    ensureOrgMembership(),
    async (req: any, res) => {
      try {
        const membership = req.orgMembership as OrgMembershipInfo;
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ error: "Invalid recording ID" });
        }
        
        const recording = await storage.getMeetingRecording(id);
        if (!recording) {
          return res.status(404).json({ error: "Recording not found" });
        }
        
        // Verify org access
        if (recording.orgId !== membership.orgId) {
          return res.status(404).json({ error: "Recording not found" });
        }
        
        // Verify Gemini AI integrations is configured
        const hasGeminiIntegrations = process.env.AI_INTEGRATIONS_GEMINI_API_KEY && process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
        
        if (!hasGeminiIntegrations) {
          console.error("No Gemini API key configured for meeting analysis");
          return res.status(500).json({ 
            error: "AI analysis service is not available",
          });
        }

        // Get recording URL from request body (uploaded via object storage)
        const { recordingUrl, durationSeconds } = req.body;
        
        if (!recordingUrl) {
          return res.status(400).json({ error: "Recording URL is required" });
        }
        
        // Update recording with URL and duration
        await storage.updateMeetingRecording(id, {
          recordingUrl,
          durationSeconds: durationSeconds || 0,
          status: "processing",
        });

        // Use Gemini for transcription and analysis
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({
          apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
          httpOptions: {
            apiVersion: "",
            baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
          },
        });

        let aiSummary = "";
        let keyTakeaways: string[] = [];
        let sentiment = "neutral";
        let transcription = "";
        let objections: string[] = [];
        let concerns: string[] = [];
        let actionItems: string[] = [];

        try {
          // Fetch the audio file and convert to base64
          console.log("Fetching audio from:", recordingUrl);
          const audioResponse = await fetch(recordingUrl);
          if (!audioResponse.ok) {
            throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
          }
          
          const audioBuffer = await audioResponse.arrayBuffer();
          const audioBase64 = Buffer.from(audioBuffer).toString("base64");
          console.log("Audio fetched, size:", audioBuffer.byteLength, "bytes");
          
          // Analyze the meeting with AI using audio input
          const analysisPrompt = `You are analyzing a sales meeting audio recording for a payment processing sales team (PCBancard).

Business: ${recording.businessName || "Unknown"}
Contact: ${recording.contactName || "Unknown"}

Please listen to this audio recording and provide a comprehensive analysis:
1. TRANSCRIPTION: A full text transcription of the conversation
2. SUMMARY: A brief summary (2-3 sentences) of what was discussed
3. KEY POINTS: 3-5 key takeaways or important points
4. OBJECTIONS: Any specific objections the merchant raised (e.g., "I don't want to change processors", "Your rates are too high")
5. CONCERNS: Any concerns or worries the merchant expressed (e.g., "I'm worried about downtime", "What about my current contract?")
6. ACTION ITEMS: Follow-up actions needed based on the conversation (e.g., "Send pricing proposal", "Schedule follow-up call")
7. SENTIMENT: Overall sentiment (positive, neutral, or negative)

If the audio is unclear or you cannot understand it, still provide your best analysis based on what you can hear.

Format your response as JSON:
{
  "transcription": "Full conversation text here...",
  "summary": "Brief summary of the actual conversation here",
  "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],
  "objections": ["objection 1", "objection 2"],
  "concerns": ["concern 1", "concern 2"],
  "actionItems": ["action 1", "action 2"],
  "sentiment": "positive|neutral|negative"
}`;

          const analysisResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType: "audio/webm",
                      data: audioBase64,
                    },
                  },
                  { text: analysisPrompt },
                ],
              },
            ],
          });
          
          const analysisText = analysisResponse.text || "";
          console.log("AI Analysis response:", analysisText.substring(0, 200));
          
          // Parse the JSON response
          const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            transcription = parsed.transcription || "";
            aiSummary = parsed.summary || "";
            keyTakeaways = parsed.keyTakeaways || [];
            objections = parsed.objections || [];
            concerns = parsed.concerns || [];
            actionItems = parsed.actionItems || [];
            sentiment = parsed.sentiment || "neutral";
          }
        } catch (analysisError: any) {
          console.error("Error analyzing meeting audio:", analysisError?.message || analysisError);
          // Mark as failed and don't send email with bogus analysis
          const failedRecording = await storage.updateMeetingRecording(id, {
            status: "failed",
            aiSummary: "Audio analysis could not be completed. Please try again or contact support.",
          });
          return res.json({
            ...failedRecording,
            emailSent: false,
            analysisError: "AI transcription failed",
          });
        }

        // Validate that we got actual content from the analysis
        if (!aiSummary || aiSummary.length < 10) {
          console.error("AI returned empty or too short summary");
          const failedRecording = await storage.updateMeetingRecording(id, {
            status: "failed",
            aiSummary: "Audio analysis returned no meaningful content. The recording may be too short or unclear.",
          });
          return res.json({
            ...failedRecording,
            emailSent: false,
            analysisError: "Analysis returned no content",
          });
        }

        // Update recording with analysis results
        const updatedRecording = await storage.updateMeetingRecording(id, {
          status: "completed",
          aiSummary,
          keyTakeaways,
          sentiment,
          transcription: transcription || null,
          objections: objections.length > 0 ? objections : null,
          concerns: concerns.length > 0 ? concerns : null,
          actionItems: actionItems.length > 0 ? actionItems : null,
        });

        // Format duration for email
        const minutes = Math.floor((durationSeconds || 0) / 60);
        const seconds = (durationSeconds || 0) % 60;
        const durationFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;

        // Get agent info for email
        const agentName = req.user.claims.name || req.user.claims.email || "Unknown Agent";
        const agentEmail = req.user.claims.email || "";

        // Send email to office with actual transcription results
        const emailSent = await sendMeetingRecordingEmail({
          agentName,
          agentEmail,
          businessName: recording.businessName || "Unknown Business",
          contactName: recording.contactName || undefined,
          businessPhone: recording.businessPhone || undefined,
          recordingUrl,
          recordingId: id,
          durationFormatted,
          aiSummary,
          keyTakeaways,
          sentiment,
          recordedAt: recording.createdAt,
        });

        if (emailSent) {
          await storage.updateMeetingRecording(id, {
            emailSentAt: new Date(),
          });
        }

        res.json({
          ...updatedRecording,
          emailSent,
        });
      } catch (error: any) {
        console.error("Error completing meeting recording:", error?.message || error);
        res.status(500).json({ 
          error: "Failed to complete meeting recording",
        });
      }
    }
  );

  // Download meeting recording as file
  app.get(
    "/api/meeting-recordings/:id/download",
    isAuthenticated,
    ensureOrgMembership(),
    async (req: any, res) => {
      try {
        const membership = req.orgMembership as OrgMembershipInfo;
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ error: "Invalid recording ID" });
        }
        
        const recording = await storage.getMeetingRecording(id);
        if (!recording || !recording.recordingUrl) {
          return res.status(404).json({ error: "Recording not found" });
        }
        
        if (recording.orgId !== membership.orgId) {
          return res.status(404).json({ error: "Recording not found" });
        }
        
        // Fetch the file from storage
        const response = await fetch(recording.recordingUrl);
        if (!response.ok) {
          return res.status(500).json({ error: "Failed to fetch recording" });
        }
        
        // Generate filename
        const filename = `meeting-recording-${id}.webm`;
        
        // Set headers for download
        res.setHeader('Content-Type', 'audio/webm');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Stream the response
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
      } catch (error: any) {
        console.error("Error downloading recording:", error?.message || error);
        res.status(500).json({ error: "Failed to download recording" });
      }
    }
  );

  // User Preferences API
  app.get("/api/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let preferences = await storage.getUserPreferences(userId);
      
      if (!preferences) {
        preferences = await storage.createUserPreferences(userId);
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  app.patch("/api/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const parsed = updateUserPreferencesSchema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.errors.map(e => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return res.status(400).json({ 
          error: "Validation failed",
          details: errors 
        });
      }
      
      let preferences = await storage.getUserPreferences(userId);
      if (!preferences) {
        preferences = await storage.createUserPreferences(userId);
      }
      
      const updated = await storage.updateUserPreferences(userId, parsed.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // User Role API - Get current user's role and org info
  app.get("/api/me/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      let membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        membership = await bootstrapUserOrganization(userId);
      }
      
      res.json({
        role: membership.role,
        memberId: membership.id,
        organization: {
          id: membership.organization.id,
          name: membership.organization.name,
        },
        managerId: membership.managerId,
        profileComplete: membership.profileComplete,
        profilePhotoUrl: membership.profilePhotoUrl || null,
        firstName: membership.firstName || null,
        lastName: membership.lastName || null,
      });
    } catch (error) {
      console.error("Error fetching user role:", error);
      res.status(500).json({ error: "Failed to fetch user role" });
    }
  });

  // Update current user's profile
  app.put("/api/me/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      let membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        membership = await bootstrapUserOrganization(userId);
      }

      const profileSchema = z.object({
        firstName: z.string().min(1, "First name is required").max(100),
        lastName: z.string().min(1, "Last name is required").max(100),
        email: z.string().email("Invalid email address").max(255),
        phone: z.string().min(10, "Phone number must be at least 10 digits").max(20),
        company: z.string().max(150).optional(),
        territory: z.string().max(100).optional(),
        profilePhotoUrl: z.string().optional().or(z.literal("")),
        companyLogoUrl: z.string().optional().or(z.literal("")),
      });

      const parsed = profileSchema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.errors.map(e => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return res.status(400).json({ 
          error: "Validation failed",
          details: errors 
        });
      }

      const updated = await storage.updateMemberProfile(membership.id, {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        company: parsed.data.company || null,
        territory: parsed.data.territory || null,
        profilePhotoUrl: parsed.data.profilePhotoUrl || null,
        companyLogoUrl: parsed.data.companyLogoUrl || null,
        profileComplete: true,
      });

      if (!updated) {
        return res.status(404).json({ error: "Member not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Get current user's full member info (including contact details for marketing)
  app.get("/api/me/member", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      let membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        membership = await bootstrapUserOrganization(userId);
      }
      
      res.json({
        id: membership.id,
        firstName: membership.firstName,
        lastName: membership.lastName,
        email: membership.email,
        phone: membership.phone,
        company: membership.company,
        territory: membership.territory,
        role: membership.role,
        profileComplete: membership.profileComplete,
        profilePhotoUrl: membership.profilePhotoUrl,
        companyLogoUrl: membership.companyLogoUrl,
      });
    } catch (error) {
      console.error("Error fetching member info:", error);
      res.status(500).json({ error: "Failed to fetch member info" });
    }
  });

  // Organization API - Get current user's organization info
  app.get("/api/organization", isAuthenticated, requireOrgAccess(), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      res.json({
        id: membership.organization.id,
        name: membership.organization.name,
        createdAt: membership.organization.createdAt,
        userRole: membership.role,
        userMemberId: membership.id,
      });
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });

  // Organization Members API - Get all members (admin/RM only)
  app.get("/api/organization/members", isAuthenticated, requireRole("master_admin", "relationship_manager"), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const members = await storage.getOrganizationMembers(membership.organization.id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching organization members:", error);
      res.status(500).json({ error: "Failed to fetch organization members" });
    }
  });

  // Organization Members API - Add a new member (admin only)
  app.post("/api/organization/members", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      
      const memberSchema = z.object({
        userId: z.string().min(1, "User ID is required"),
        role: z.enum(ORG_MEMBER_ROLES, {
          errorMap: () => ({ message: `Role must be one of: ${ORG_MEMBER_ROLES.join(", ")}` })
        }),
        managerId: z.number().optional().nullable(),
      });
      
      const parsed = memberSchema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.errors.map(e => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return res.status(400).json({ 
          error: "Validation failed",
          details: errors 
        });
      }
      
      const existingMember = await storage.getOrganizationMember(membership.organization.id, parsed.data.userId);
      if (existingMember) {
        return res.status(409).json({ error: "User is already a member of this organization" });
      }
      
      const newMember = await storage.createOrganizationMember({
        orgId: membership.organization.id,
        userId: parsed.data.userId,
        role: parsed.data.role,
        managerId: parsed.data.managerId ?? null,
      });
      
      res.status(201).json(newMember);
    } catch (error) {
      console.error("Error adding organization member:", error);
      res.status(500).json({ error: "Failed to add organization member" });
    }
  });

  // Organization Members API - Update member role/manager (admin only)
  app.patch("/api/organization/members/:id", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const memberId = parseInt(req.params.id);
      
      if (isNaN(memberId)) {
        return res.status(400).json({ error: "Invalid member ID" });
      }
      
      const updateSchema = z.object({
        role: z.enum(ORG_MEMBER_ROLES, {
          errorMap: () => ({ message: `Role must be one of: ${ORG_MEMBER_ROLES.join(", ")}` })
        }).optional(),
        managerId: z.number().nullable().optional(),
        firstName: z.string().max(100).nullable().optional(),
        lastName: z.string().max(100).nullable().optional(),
      });
      
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.errors.map(e => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return res.status(400).json({ 
          error: "Validation failed",
          details: errors 
        });
      }
      
      if (Object.keys(parsed.data).length === 0) {
        return res.status(400).json({ error: "No update data provided" });
      }
      
      const members = await storage.getOrganizationMembers(membership.organization.id);
      const targetMember = members.find(m => m.id === memberId);
      
      if (!targetMember) {
        return res.status(404).json({ error: "Member not found in this organization" });
      }
      
      if (targetMember.id === membership.id && parsed.data.role && parsed.data.role !== "master_admin") {
        const adminCount = members.filter(m => m.role === "master_admin").length;
        if (adminCount <= 1) {
          return res.status(400).json({ error: "Cannot change role: Organization must have at least one master admin" });
        }
      }
      
      const updated = await storage.updateOrganizationMember(memberId, parsed.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating organization member:", error);
      res.status(500).json({ error: "Failed to update organization member" });
    }
  });

  // Organization Members API - Remove member (admin only)
  app.delete("/api/organization/members/:id", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const memberId = parseInt(req.params.id);
      
      if (isNaN(memberId)) {
        return res.status(400).json({ error: "Invalid member ID" });
      }
      
      const members = await storage.getOrganizationMembers(membership.organization.id);
      const targetMember = members.find(m => m.id === memberId);
      
      if (!targetMember) {
        return res.status(404).json({ error: "Member not found in this organization" });
      }
      
      if (targetMember.id === membership.id) {
        return res.status(400).json({ error: "Cannot remove yourself from the organization" });
      }
      
      if (targetMember.role === "master_admin") {
        const adminCount = members.filter(m => m.role === "master_admin").length;
        if (adminCount <= 1) {
          return res.status(400).json({ error: "Cannot remove: Organization must have at least one master admin" });
        }
      }
      
      const deleted = await storage.deleteOrganizationMember(memberId);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ error: "Failed to delete member" });
      }
    } catch (error) {
      console.error("Error removing organization member:", error);
      res.status(500).json({ error: "Failed to remove organization member" });
    }
  });

  // Consolidate all organizations - merge all members into the primary org (admin only)
  app.post("/api/organization/consolidate", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const currentOrgId = membership.organization.id;
      
      // Get all organizations
      const allOrgs = await db.select().from(organizations);
      
      // Get all organization members from other organizations
      const otherOrgMembers = await db.select()
        .from(organizationMembers)
        .where(sql`${organizationMembers.orgId} != ${currentOrgId}`);
      
      let movedCount = 0;
      const skipped: string[] = [];
      
      for (const member of otherOrgMembers) {
        // Check if this user already exists in the current organization
        const existingInCurrentOrg = await db.select()
          .from(organizationMembers)
          .where(sql`${organizationMembers.orgId} = ${currentOrgId} AND ${organizationMembers.userId} = ${member.userId}`)
          .limit(1);
        
        if (existingInCurrentOrg.length > 0) {
          // User already exists in current org, skip
          skipped.push(member.email || member.userId);
          continue;
        }
        
        // Move member to current organization
        await db.update(organizationMembers)
          .set({ orgId: currentOrgId })
          .where(eq(organizationMembers.id, member.id));
        
        movedCount++;
      }
      
      res.json({ 
        success: true, 
        message: `Consolidated ${movedCount} team members into your organization`,
        movedCount,
        skipped,
        currentOrgId,
        otherOrgsFound: allOrgs.filter(o => o.id !== currentOrgId).map(o => ({ id: o.id, name: o.name }))
      });
    } catch (error) {
      console.error("Error consolidating organizations:", error);
      res.status(500).json({ error: "Failed to consolidate organizations" });
    }
  });

  // ============================================
  // USER PERMISSIONS API (RBAC)
  // ============================================

  // Import permission utilities
  const { 
    FEATURES, 
    PERMISSION_PRESETS,
    getEffectivePermissions, 
    mapOrgRoleToUserRole,
    getFeaturesByStageUnlock,
    getFeatureById
  } = await import("@shared/permissions");
  type UserRole = 'admin' | 'manager' | 'agent';
  type AgentStage = 'trainee' | 'active' | 'senior';

  // Get current user's permissions with effective features
  app.get("/api/permissions/me", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      // Use effective user ID to support impersonation
      const userId = await getEffectiveUserId(req);
      const membership = await getEffectiveMembership(req) || req.orgMembership as OrgMembershipInfo;
      
      let perms = await storage.getUserPermissions(userId);
      
      // Create default permissions if they don't exist
      if (!perms) {
        const role = mapOrgRoleToUserRole(membership.role);
        perms = await storage.createUserPermissions({
          userId,
          orgId: membership.orgId,
          role,
          agentStage: role === 'agent' ? 'trainee' : null,
          featureOverrides: {}
        } as any);
      }
      
      // Sync permission role with org membership role (handles auto-upgrade from ensureOrgMembership)
      const expectedPermRole = mapOrgRoleToUserRole(membership.role);
      if (perms.role !== expectedPermRole) {
        await storage.updateUserPermissions(userId, { 
          role: expectedPermRole, 
          agentStage: expectedPermRole === 'agent' ? (perms.agentStage || 'trainee') : null 
        });
        perms.role = expectedPermRole;
      }
      
      // Get org-level feature disables
      const orgFeatures = await storage.getOrganizationFeatures(membership.orgId);
      const overrides = { ...((perms.featureOverrides as Record<string, boolean>) || {}) };
      for (const feature of orgFeatures) {
        if (!feature.enabled) {
          overrides[feature.featureId] = false;
        }
      }
      
      const permData = {
        userId: perms.userId,
        organizationId: membership.orgId,
        role: (perms.role as UserRole) || mapOrgRoleToUserRole(membership.role),
        agentStage: (perms.agentStage as AgentStage) || 'trainee',
        overrides
      };
      
      const effective = getEffectivePermissions(permData);
      
      res.json({
        userId: perms.userId,
        organizationId: membership.orgId,
        role: permData.role,
        agentStage: permData.agentStage,
        overrides: permData.overrides,
        effectiveFeatures: effective.features,
        canManagePermissions: effective.canManagePermissions,
        canViewTeam: effective.canViewTeam
      });
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  // Get feature registry
  app.get("/api/permissions/features", isAuthenticated, async (req: any, res) => {
    try {
      const byStage = getFeaturesByStageUnlock();
      
      res.json({
        features: FEATURES,
        presets: PERMISSION_PRESETS,
        byStageUnlock: {
          trainee: byStage.trainee.map(f => f.id),
          active: byStage.active.map(f => f.id),
          senior: byStage.senior.map(f => f.id),
          managerOnly: byStage.managerOnly.map(f => f.id),
          adminOnly: byStage.adminOnly.map(f => f.id)
        }
      });
    } catch (error) {
      console.error("Error fetching feature registry:", error);
      res.status(500).json({ error: "Failed to fetch features" });
    }
  });

  // Get all users with permissions (manager+ only)
  app.get("/api/permissions/users", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const currentRole = mapOrgRoleToUserRole(membership.role);
      
      // Only managers and admins can view users
      if (currentRole !== 'admin' && currentRole !== 'manager') {
        return res.status(403).json({ error: "ACCESS_DENIED", message: "Manager role or higher required" });
      }
      
      // Get all org members
      const members = await storage.getOrganizationMembers(membership.organization.id);
      
      // Get permissions for each user
      const usersWithPerms = await Promise.all(
        members.map(async (member) => {
          let perms = await storage.getUserPermissions(member.userId);
          return {
            id: member.id,
            userId: member.userId,
            name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown',
            email: member.email,
            orgRole: member.role,
            role: (perms?.role as UserRole) || mapOrgRoleToUserRole(member.role),
            agentStage: (perms?.agentStage as AgentStage) || 'trainee',
            overrides: (perms?.featureOverrides as Record<string, boolean>) || {},
            updatedAt: perms?.updatedAt || member.createdAt
          };
        })
      );
      
      // Filter: managers can only see agents
      const filteredUsers = currentRole === 'admin' 
        ? usersWithPerms
        : usersWithPerms.filter(u => u.role === 'agent');
      
      res.json({ users: filteredUsers });
    } catch (error) {
      console.error("Error fetching users with permissions:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Update user role (admin only)
  app.patch("/api/permissions/users/:targetUserId/role", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const { targetUserId } = req.params;
      const { role, reason } = req.body;
      const changedBy = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const currentRole = mapOrgRoleToUserRole(membership.role);
      
      // Only admins can change roles
      if (currentRole !== 'admin') {
        return res.status(403).json({ error: "ACCESS_DENIED", message: "Admin role required" });
      }
      
      // Validate role
      if (!['admin', 'manager', 'agent'].includes(role)) {
        return res.status(400).json({ error: "INVALID_ROLE" });
      }
      
      // Can't change own role
      if (targetUserId === changedBy) {
        return res.status(400).json({ error: "CANNOT_CHANGE_OWN_ROLE" });
      }
      
      // CRITICAL: Verify target user is in the same organization
      const orgMembers = await storage.getOrganizationMembers(membership.organization.id);
      const targetInOrg = orgMembers.some(m => m.userId === targetUserId);
      if (!targetInOrg) {
        return res.status(403).json({ error: "ACCESS_DENIED", message: "User not in your organization" });
      }
      
      // Get current permissions
      let perms = await storage.getUserPermissions(targetUserId);
      const oldRole = perms?.role || 'agent';
      
      if (!perms) {
        perms = await storage.createUserPermissions({
          userId: targetUserId,
          orgId: membership.orgId,
          role,
          agentStage: role === 'agent' ? 'trainee' : null
        } as any);
      } else {
        await storage.updateUserPermissions(targetUserId, { 
          role, 
          setBy: changedBy,
          agentStage: role === 'agent' ? (perms.agentStage || 'trainee') : null
        });
      }
      
      // Audit log
      await storage.createPermissionAuditLog({
        orgId: membership.orgId,
        changedByUserId: changedBy,
        targetUserId,
        changeType: 'role_change',
        oldRole,
        newRole: role,
        reason
      });
      
      res.json({ success: true, role });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  // Update agent stage (manager+ only)
  app.patch("/api/permissions/users/:targetUserId/stage", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const { targetUserId } = req.params;
      const { stage, reason } = req.body;
      const changedBy = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const currentRole = mapOrgRoleToUserRole(membership.role);
      
      // Only managers and admins can change stages
      if (currentRole !== 'admin' && currentRole !== 'manager') {
        return res.status(403).json({ error: "ACCESS_DENIED", message: "Manager role or higher required" });
      }
      
      // Validate stage
      if (!['trainee', 'active', 'senior'].includes(stage)) {
        return res.status(400).json({ error: "INVALID_STAGE" });
      }
      
      // CRITICAL: Verify target user is in the same organization
      const orgMembers = await storage.getOrganizationMembers(membership.organization.id);
      const targetInOrg = orgMembers.some(m => m.userId === targetUserId);
      if (!targetInOrg) {
        return res.status(403).json({ error: "ACCESS_DENIED", message: "User not in your organization" });
      }
      
      // Get current permissions
      let perms = await storage.getUserPermissions(targetUserId);
      const oldStage = perms?.agentStage || 'trainee';
      
      // Managers can only modify agents
      if (perms?.role && perms.role !== 'agent' && currentRole !== 'admin') {
        return res.status(403).json({ error: "CAN_ONLY_MODIFY_AGENTS" });
      }
      
      if (!perms) {
        perms = await storage.createUserPermissions({
          userId: targetUserId,
          orgId: membership.orgId,
          role: 'agent',
          agentStage: stage
        } as any);
      } else {
        await storage.updateUserPermissions(targetUserId, { 
          agentStage: stage,
          setBy: changedBy 
        });
      }
      
      // Audit log
      await storage.createPermissionAuditLog({
        orgId: membership.orgId,
        changedByUserId: changedBy,
        targetUserId,
        changeType: 'stage_change',
        oldStage,
        newStage: stage,
        reason
      });
      
      res.json({ success: true, stage });
    } catch (error) {
      console.error("Error updating agent stage:", error);
      res.status(500).json({ error: "Failed to update stage" });
    }
  });

  // Get single user's permissions (manager+ only, must be same org)
  app.get("/api/permissions/users/:targetUserId", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const { targetUserId } = req.params;
      const membership = req.orgMembership as OrgMembershipInfo;
      const currentRole = mapOrgRoleToUserRole(membership.role);
      
      // Only managers and admins can view user permissions
      if (currentRole !== 'admin' && currentRole !== 'manager') {
        return res.status(403).json({ error: "ACCESS_DENIED", message: "Manager role or higher required" });
      }
      
      // CRITICAL: Verify target user is in the same organization
      const orgMembers = await storage.getOrganizationMembers(membership.organization.id);
      const targetMember = orgMembers.find(m => m.userId === targetUserId);
      if (!targetMember) {
        return res.status(403).json({ error: "ACCESS_DENIED", message: "User not in your organization" });
      }
      
      // Get user permissions
      let perms = await storage.getUserPermissions(targetUserId);
      
      // Return with member info for role/stage display
      res.json({
        userId: targetUserId,
        role: perms?.role || mapOrgRoleToUserRole(targetMember.role),
        agentStage: perms?.agentStage || 'trainee',
        overrides: (perms?.featureOverrides as Record<string, boolean>) || {}
      });
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  // Add/update feature override (manager+ only)
  app.post("/api/permissions/users/:targetUserId/override", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const { targetUserId } = req.params;
      const { featureId, enabled, reason } = req.body;
      const changedBy = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const currentRole = mapOrgRoleToUserRole(membership.role);
      
      // Only managers and admins can add overrides
      if (currentRole !== 'admin' && currentRole !== 'manager') {
        return res.status(403).json({ error: "ACCESS_DENIED", message: "Manager role or higher required" });
      }
      
      // Validate feature exists
      const feature = getFeatureById(featureId);
      if (!feature) {
        return res.status(400).json({ error: "INVALID_FEATURE" });
      }
      
      // Can't override critical features
      if (feature.isCritical) {
        return res.status(400).json({ error: "CANNOT_OVERRIDE_CRITICAL" });
      }
      
      // CRITICAL: Verify target user is in the same organization
      const orgMembers = await storage.getOrganizationMembers(membership.organization.id);
      const targetInOrg = orgMembers.some(m => m.userId === targetUserId);
      if (!targetInOrg) {
        return res.status(403).json({ error: "ACCESS_DENIED", message: "User not in your organization" });
      }
      
      // Get current permissions
      let perms = await storage.getUserPermissions(targetUserId);
      
      // Managers can only modify agents
      if (perms?.role && perms.role !== 'agent' && currentRole !== 'admin') {
        return res.status(403).json({ error: "CAN_ONLY_MODIFY_AGENTS" });
      }
      
      const currentOverrides = (perms?.featureOverrides as Record<string, boolean>) || {};
      const oldOverride = currentOverrides[featureId];
      
      // Update overrides
      const newOverrides = { ...currentOverrides };
      if (enabled === null || enabled === undefined) {
        delete newOverrides[featureId]; // Remove override
      } else {
        newOverrides[featureId] = enabled;
      }
      
      console.log(`[PermissionOverride] Saving override for ${targetUserId}: ${featureId} = ${enabled}`);
      console.log(`[PermissionOverride] New overrides:`, JSON.stringify(newOverrides));
      
      if (!perms) {
        console.log(`[PermissionOverride] Creating new permissions for ${targetUserId}`);
        perms = await storage.createUserPermissions({
          userId: targetUserId,
          orgId: membership.orgId,
          role: 'agent',
          agentStage: 'trainee',
          featureOverrides: newOverrides
        } as any);
      } else {
        console.log(`[PermissionOverride] Updating permissions for ${targetUserId}`);
        await storage.updateUserPermissions(targetUserId, { 
          featureOverrides: newOverrides,
          setBy: changedBy 
        });
      }
      
      // Verify save
      const verifyPerms = await storage.getUserPermissions(targetUserId);
      console.log(`[PermissionOverride] Verified overrides:`, JSON.stringify(verifyPerms?.featureOverrides));
      
      // Audit log
      await storage.createPermissionAuditLog({
        orgId: membership.orgId,
        changedByUserId: changedBy,
        targetUserId,
        changeType: enabled === null ? 'override_removed' : (oldOverride === undefined ? 'override_added' : 'override_changed'),
        featureId,
        oldOverride,
        newOverride: enabled,
        reason
      });
      
      res.json({ success: true, featureId, enabled });
    } catch (error) {
      console.error("Error updating feature override:", error);
      res.status(500).json({ error: "Failed to update override" });
    }
  });

  // Apply preset (manager+ only)
  app.post("/api/permissions/users/:targetUserId/preset", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const { targetUserId } = req.params;
      const { presetId, reason } = req.body;
      const changedBy = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const currentRole = mapOrgRoleToUserRole(membership.role);
      
      // Only managers and admins can apply presets
      if (currentRole !== 'admin' && currentRole !== 'manager') {
        return res.status(403).json({ error: "ACCESS_DENIED", message: "Manager role or higher required" });
      }
      
      // Find preset
      const preset = PERMISSION_PRESETS.find(p => p.id === presetId);
      if (!preset) {
        return res.status(400).json({ error: "INVALID_PRESET" });
      }
      
      // Managers can only apply agent presets
      if (preset.role !== 'agent' && currentRole !== 'admin') {
        return res.status(403).json({ error: "CAN_ONLY_APPLY_AGENT_PRESETS" });
      }
      
      // CRITICAL: Verify target user is in the same organization
      const orgMembers = await storage.getOrganizationMembers(membership.organization.id);
      const targetInOrg = orgMembers.some(m => m.userId === targetUserId);
      if (!targetInOrg) {
        return res.status(403).json({ error: "ACCESS_DENIED", message: "User not in your organization" });
      }
      
      // Get current permissions
      let perms = await storage.getUserPermissions(targetUserId);
      
      if (!perms) {
        perms = await storage.createUserPermissions({
          userId: targetUserId,
          orgId: membership.orgId,
          role: preset.role,
          agentStage: preset.agentStage || null,
          featureOverrides: {}
        } as any);
      } else {
        await storage.updateUserPermissions(targetUserId, { 
          role: preset.role,
          agentStage: preset.agentStage || null,
          featureOverrides: {},
          setBy: changedBy 
        });
      }
      
      // Audit log
      await storage.createPermissionAuditLog({
        orgId: membership.orgId,
        changedByUserId: changedBy,
        targetUserId,
        changeType: 'preset_applied',
        presetId,
        newRole: preset.role,
        newStage: preset.agentStage,
        reason
      });
      
      res.json({ success: true, preset });
    } catch (error) {
      console.error("Error applying preset:", error);
      res.status(500).json({ error: "Failed to apply preset" });
    }
  });

  // Legacy: Get current user's permissions (old endpoint for backwards compatibility)
  app.get("/api/me/permissions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      let perms = await storage.getUserPermissions(userId);
      
      // Create default permissions if they don't exist
      if (!perms) {
        perms = await storage.createUserPermissions({ userId });
      }
      
      res.json(perms);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  // Legacy: Get permissions for a specific user (admin only)
  app.get("/api/permissions/:userId", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const { userId } = req.params;
      let perms = await storage.getUserPermissions(userId);
      
      // Create default permissions if they don't exist
      if (!perms) {
        perms = await storage.createUserPermissions(userId);
      }
      
      res.json(perms);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  // Update permissions for a user (admin only)
  app.patch("/api/permissions/:userId", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      // Ensure permissions exist first
      let perms = await storage.getUserPermissions(userId);
      if (!perms) {
        perms = await storage.createUserPermissions(userId);
      }
      
      const updated = await storage.updateUserPermissions(userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating user permissions:", error);
      res.status(500).json({ error: "Failed to update permissions" });
    }
  });

  // Get all user permissions (admin only, for management UI)
  app.get("/api/permissions", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const perms = await storage.getAllUserPermissions();
      res.json(perms);
    } catch (error) {
      console.error("Error fetching all permissions:", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  // ============================================
  // IMPERSONATION API
  // ============================================

  // Get list of users that can be impersonated
  app.get("/api/impersonation/available-users", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      
      // Only admins and managers can impersonate
      if (membership.role !== "master_admin" && membership.role !== "relationship_manager") {
        return res.status(403).json({ error: "Not authorized to impersonate users" });
      }
      
      const users = await storage.getImpersonatableUsers(userId, membership.organization.id);
      
      // Get user details for each member
      const usersWithDetails = await Promise.all(
        users.map(async (member) => {
          const user = await authStorage.getUser(member.userId);
          return {
            id: member.id,
            userId: member.userId,
            firstName: user?.firstName || member.firstName || "Unknown",
            lastName: user?.lastName || member.lastName || "User",
            email: user?.email || null,
            role: member.role,
          };
        })
      );
      
      res.json(usersWithDetails);
    } catch (error) {
      console.error("Error fetching impersonatable users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Start impersonation session
  app.post("/api/impersonation/start", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const originalUserId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const { targetUserId, reason } = req.body;
      
      if (!targetUserId) {
        return res.status(400).json({ error: "Target user ID is required" });
      }
      
      // Only admins and managers can impersonate
      if (membership.role !== "master_admin" && membership.role !== "relationship_manager") {
        return res.status(403).json({ error: "Not authorized to impersonate users" });
      }
      
      // Verify the target user can be impersonated by this user
      const impersonatableUsers = await storage.getImpersonatableUsers(originalUserId, membership.organization.id);
      const canImpersonate = impersonatableUsers.some(u => u.userId === targetUserId);
      
      if (!canImpersonate) {
        return res.status(403).json({ error: "Cannot impersonate this user" });
      }
      
      // Get target user info
      const targetUser = await authStorage.getUser(targetUserId);
      const targetMembership = await storage.getOrganizationMember(membership.organization.id, targetUserId);
      
      // Generate session token
      const crypto = await import("crypto");
      const sessionToken = crypto.randomUUID();
      
      // Create impersonation session
      const session = await storage.createImpersonationSession({
        originalUserId,
        impersonatedUserId: targetUserId,
        sessionToken,
        reason: reason || null,
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
        startedAt: new Date(),
        status: "active",
        organizationId: membership.organization.id,
      });
      
      // Create audit log entry
      await storage.createImpersonationAuditLog({
        sessionId: session.id,
        originalUserId,
        impersonatedUserId: targetUserId,
        action: "start",
        reason: reason || null,
        organizationId: membership.organization.id,
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });
      
      res.json({
        sessionId: session.id,
        sessionToken,
        impersonatedUser: {
          userId: targetUserId,
          firstName: targetUser?.firstName || targetMembership?.firstName || "Unknown",
          lastName: targetUser?.lastName || targetMembership?.lastName || "User",
          email: targetUser?.email || null,
          role: targetMembership?.role || "agent",
        },
        originalUser: {
          userId: originalUserId,
          firstName: req.user.claims.name?.split(' ')[0] || "Admin",
          lastName: req.user.claims.name?.split(' ').slice(1).join(' ') || "",
          role: membership.role,
        },
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      console.error("Error starting impersonation:", error);
      res.status(500).json({ error: "Failed to start impersonation" });
    }
  });

  // End impersonation session
  app.post("/api/impersonation/end", isAuthenticated, async (req: any, res) => {
    try {
      const { sessionToken } = req.body;
      
      if (!sessionToken) {
        return res.status(400).json({ error: "Session token is required" });
      }
      
      const session = await storage.getImpersonationSessionByToken(sessionToken);
      
      if (!session) {
        return res.status(404).json({ error: "Impersonation session not found" });
      }
      
      // End the session
      await storage.endImpersonationSession(session.id);
      
      // Log the end action
      await storage.createImpersonationAuditLog({
        sessionId: session.id,
        originalUserId: session.originalUserId,
        impersonatedUserId: session.impersonatedUserId,
        action: "end",
        reason: null,
        organizationId: session.organizationId,
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error ending impersonation:", error);
      res.status(500).json({ error: "Failed to end impersonation" });
    }
  });

  // Validate impersonation session
  app.get("/api/impersonation/validate", isAuthenticated, async (req: any, res) => {
    try {
      const sessionToken = req.headers["x-impersonation-token"] as string;
      
      if (!sessionToken) {
        return res.json({ valid: false, session: null });
      }
      
      const session = await storage.getImpersonationSessionByToken(sessionToken);
      
      if (!session) {
        return res.json({ valid: false, session: null });
      }
      
      // Check if session is expired
      if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
        await storage.endImpersonationSession(session.id);
        return res.json({ valid: false, session: null, reason: "expired" });
      }
      
      // Get user details including original user's membership role
      const impersonatedUser = await authStorage.getUser(session.impersonatedUserId);
      const originalUser = await authStorage.getUser(session.originalUserId);
      const originalMembership = await storage.getUserMembership(session.originalUserId);
      const impersonatedMembership = session.organizationId ? await storage.getOrganizationMember(
        session.organizationId,
        session.impersonatedUserId
      ) : undefined;
      
      res.json({
        valid: true,
        session: {
          id: session.id,
          impersonatedUser: {
            userId: session.impersonatedUserId,
            firstName: impersonatedUser?.firstName || "Unknown",
            lastName: impersonatedUser?.lastName || "User",
            email: impersonatedUser?.email || null,
            role: impersonatedMembership?.role || "agent",
          },
          originalUser: {
            userId: session.originalUserId,
            firstName: originalUser?.firstName || "Unknown",
            lastName: originalUser?.lastName || "User",
            role: originalMembership?.role || "agent",
          },
          startedAt: session.startedAt,
          expiresAt: session.expiresAt,
        },
      });
    } catch (error) {
      console.error("Error validating impersonation:", error);
      res.status(500).json({ error: "Failed to validate session" });
    }
  });

  // Get active impersonation sessions (admin only)
  app.get("/api/impersonation/sessions", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const sessions = await storage.getAllActiveImpersonationSessions();
      
      // Get user details for each session
      const sessionsWithDetails = await Promise.all(
        sessions.map(async (session) => {
          const originalUser = await authStorage.getUser(session.originalUserId);
          const impersonatedUser = await authStorage.getUser(session.impersonatedUserId);
          
          return {
            id: session.id,
            originalUser: {
              userId: session.originalUserId,
              firstName: originalUser?.firstName || "Unknown",
              lastName: originalUser?.lastName || "User",
            },
            impersonatedUser: {
              userId: session.impersonatedUserId,
              firstName: impersonatedUser?.firstName || "Unknown",
              lastName: impersonatedUser?.lastName || "User",
            },
            startedAt: session.startedAt,
            expiresAt: session.expiresAt,
            reason: (session as any).reason,
          };
        })
      );
      
      res.json(sessionsWithDetails);
    } catch (error) {
      console.error("Error fetching impersonation sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Get impersonation audit log (admin only)
  app.get("/api/impersonation/audit-log", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const membership = req.orgMembership as OrgMembershipInfo;
      
      const logs = await storage.getImpersonationAuditLogs(
        membership?.organization.id,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      
      // Get user details for each log entry
      const logsWithDetails = await Promise.all(
        logs.map(async (log) => {
          const originalUser = await authStorage.getUser(log.originalUserId);
          const impersonatedUser = await authStorage.getUser(log.impersonatedUserId);
          
          return {
            ...log,
            originalUser: {
              firstName: originalUser?.firstName || "Unknown",
              lastName: originalUser?.lastName || "User",
            },
            impersonatedUser: {
              firstName: impersonatedUser?.firstName || "Unknown",
              lastName: impersonatedUser?.lastName || "User",
            },
          };
        })
      );
      
      res.json(logsWithDetails);
    } catch (error) {
      console.error("Error fetching impersonation audit log:", error);
      res.status(500).json({ error: "Failed to fetch audit log" });
    }
  });

  // ============================================
  // LEADERBOARD API
  // ============================================

  // Get leaderboard - requires canViewLeaderboard permission
  app.get("/api/leaderboard", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      const membership = req.orgMembership as OrgMembershipInfo;
      
      // Check permission (admins always have access)
      if (membership.role !== "master_admin") {
        let perms = await storage.getUserPermissions(userId);
        if (!perms) {
          perms = await storage.createUserPermissions({ userId });
        }
        
        if (!perms.canViewLeaderboard) {
          return res.status(403).json({ error: "Leaderboard access not enabled for your account" });
        }
      }
      
      // Get all organization members
      const members = await storage.getOrganizationMembers(membership.organization.id);
      
      // Build leaderboard from drops data
      const leaderboard = await Promise.all(
        members.map(async (member) => {
          // Get drops for this agent
          const drops = await storage.getDropsByAgent(member.userId);
          
          const totalDrops = drops.length;
          const conversions = drops.filter(d => d.status === "converted").length;
          const conversionRate = totalDrops > 0 ? Math.round((conversions / totalDrops) * 100) : 0;
          
          return {
            memberId: member.id,
            userId: member.userId,
            firstName: member.firstName,
            lastName: member.lastName,
            role: member.role,
            totalDrops,
            conversions,
            conversionRate,
            score: conversions * 10 + totalDrops, // Simple scoring formula
          };
        })
      );
      
      // Sort by score descending
      leaderboard.sort((a, b) => b.score - a.score);
      
      // Add rank
      const rankedLeaderboard = leaderboard.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));
      
      res.json(rankedLeaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // ============================================
  // INVITATIONS API
  // ============================================

  // Create a new invitation (admin only)
  app.post("/api/invitations", isAuthenticated, requireRole("master_admin"), ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const { email, role, managerId } = req.body;

      // Validate input
      if (!email || !role) {
        return res.status(400).json({ error: "Email and role are required" });
      }

      const parsed = insertInvitationSchema.safeParse({
        orgId: membership.organization.id,
        email,
        role,
        token: generateInviteToken(),
        status: "pending",
        invitedBy: req.user.claims.sub,
        managerId: managerId || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      if (!parsed.success) {
        const errors = parsed.error.errors.map(e => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return res.status(400).json({
          error: "Validation failed",
          details: errors,
        });
      }

      const invitation = await storage.createInvitation(parsed.data);

      // Send invitation email
      const replUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
        : 'https://brochuretracker.replit.app';
      const inviteLink = `${replUrl}/accept-invite?token=${invitation.token}`;
      
      console.log(`Sending invitation email to ${email} with link: ${inviteLink}`);
      
      const emailSent = await sendInvitationEmail({
        to: email,
        inviterName: req.user.claims.name || req.user.claims.email,
        organizationName: membership.organization.name,
        role: role,
        inviteLink,
        expiresIn: "7 days",
      });

      if (!emailSent) {
        console.warn(`Invitation created but email failed to send to ${email}`);
      }

      res.status(201).json({ ...invitation, emailSent });
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ error: "Failed to create invitation" });
    }
  });

  // Get all invitations for user's organization (admin only)
  app.get("/api/invitations", isAuthenticated, requireRole("master_admin"), ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const allInvitations = await storage.getInvitationsByOrg(membership.organization.id);
      // Only return pending invitations - accepted ones should not show in pending list
      const pendingInvitations = allInvitations.filter(inv => inv.status === "pending");
      res.json(pendingInvitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  });

  // Resend invitation email (admin only)
  app.post("/api/invitations/:id/resend", isAuthenticated, requireRole("master_admin"), ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const invitationId = parseInt(req.params.id);

      if (isNaN(invitationId)) {
        return res.status(400).json({ error: "Invalid invitation ID" });
      }

      const allInvitations = await storage.getInvitationsByOrg(membership.organization.id);
      const targetInvitation = allInvitations.find(i => i.id === invitationId);

      if (!targetInvitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      // Resend the email
      const inviteLink = `${process.env.REPL_URL || 'https://brochuretracker.replit.app'}/accept-invite?token=${targetInvitation.token}`;
      await sendInvitationEmail({
        to: targetInvitation.email,
        inviterName: req.user.claims.name || req.user.claims.email,
        organizationName: membership.organization.name,
        role: targetInvitation.role,
        inviteLink,
        expiresIn: "7 days",
      });

      res.json(targetInvitation);
    } catch (error) {
      console.error("Error resending invitation:", error);
      res.status(500).json({ error: "Failed to resend invitation" });
    }
  });

  // Cancel an invitation (admin only)
  app.delete("/api/invitations/:id", isAuthenticated, requireRole("master_admin"), ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const invitationId = parseInt(req.params.id);

      if (isNaN(invitationId)) {
        return res.status(400).json({ error: "Invalid invitation ID" });
      }

      const allInvitations = await storage.getInvitationsByOrg(membership.organization.id);
      const targetInvitation = allInvitations.find(i => i.id === invitationId);

      if (!targetInvitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      await storage.cancelInvitation(invitationId);
      res.status(204).send();
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      res.status(500).json({ error: "Failed to cancel invitation" });
    }
  });

  // Validate invitation token (public, no auth required)
  app.get("/api/invitations/accept/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ error: "Invitation is no longer valid" });
      }

      if (new Date() > invitation.expiresAt) {
        return res.status(400).json({ error: "Invitation has expired" });
      }

      const organization = await storage.getOrganization(invitation.orgId);

      res.json({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        organizationName: organization?.name,
        expiresAt: invitation.expiresAt,
      });
    } catch (error) {
      console.error("Error validating invitation:", error);
      res.status(500).json({ error: "Failed to validate invitation" });
    }
  });

  // Accept invitation (public, no auth required)
  app.post("/api/invitations/accept/:token", async (req: any, res) => {
    try {
      const { token } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ error: "Invitation is no longer valid" });
      }

      if (new Date() > invitation.expiresAt) {
        return res.status(400).json({ error: "Invitation has expired" });
      }

      // Create organization member
      const member = await storage.createOrganizationMember({
        orgId: invitation.orgId,
        userId: userId,
        role: invitation.role as any,
        managerId: invitation.managerId,
      });

      // Update invitation status to accepted
      await storage.updateInvitationStatus(invitation.id, "accepted", new Date());

      res.json({
        success: true,
        member: member,
      });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  // ============================================
  // FEEDBACK API
  // ============================================

  // Submit feedback (authenticated)
  app.post("/api/feedback", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type, subject, message, attachments } = req.body;

      const parsed = insertFeedbackSubmissionSchema.safeParse({
        userId,
        userName: req.user.claims.name || req.user.claims.email,
        userEmail: req.user.claims.email,
        type,
        subject,
        message,
        attachments,
      });

      if (!parsed.success) {
        const errors = parsed.error.errors.map(e => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return res.status(400).json({
          error: "Validation failed",
          details: errors,
        });
      }

      const feedback = await storage.createFeedbackSubmission(parsed.data);

      // Send feedback email to support
      await sendFeedbackEmail({
        userName: req.user.claims.name || req.user.claims.email,
        userEmail: req.user.claims.email,
        type,
        subject,
        message,
      });

      res.status(201).json(feedback);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  // Get all feedback submissions (admin only)
  app.get("/api/admin/feedback", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const { type, status } = req.query;
      const filters: { type?: string; status?: string } = {};
      if (type) filters.type = type as string;
      if (status) filters.status = status as string;
      const submissions = await storage.getAllFeedbackSubmissions(filters);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching feedback submissions:", error);
      res.status(500).json({ error: "Failed to fetch feedback submissions" });
    }
  });

  // Update feedback submission (admin only)
  app.patch("/api/admin/feedback/:id", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid feedback ID" });
      }

      const { status, adminNotes } = req.body;
      const validStatuses = ["new", "in_progress", "resolved", "closed"];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(", ")}` });
      }

      const updateData: { status?: string; adminNotes?: string } = {};
      if (status) updateData.status = status;
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

      const updated = await storage.updateFeedbackSubmission(id, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Feedback submission not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating feedback submission:", error);
      res.status(500).json({ error: "Failed to update feedback submission" });
    }
  });

  // Admin Dashboard API - Get org-wide stats (master_admin only)
  app.get("/api/admin/stats", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const members = await storage.getOrganizationMembers(membership.organization.id);
      
      const agentIds = members.map(m => m.userId);
      const allDrops = await storage.getDropsByOrganization(agentIds);
      
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
      
      const pendingDrops = allDrops.filter(d => d.status === "pending");
      const convertedDrops = allDrops.filter(d => d.status === "converted");
      const pickedUpDrops = allDrops.filter(d => d.status === "picked_up" || d.status === "converted");
      
      const todaysPickups = pendingDrops.filter(d => {
        if (!d.pickupScheduledFor) return false;
        const pickup = new Date(d.pickupScheduledFor);
        return pickup >= startOfToday && pickup < endOfToday;
      });
      
      const overduePickups = pendingDrops.filter(d => {
        if (!d.pickupScheduledFor) return false;
        const pickup = new Date(d.pickupScheduledFor);
        return pickup < startOfToday;
      });
      
      const rmCount = members.filter(m => m.role === "relationship_manager").length;
      const agentCount = members.filter(m => m.role === "agent").length;
      const adminCount = members.filter(m => m.role === "master_admin").length;
      
      const conversionRate = allDrops.length > 0 
        ? (convertedDrops.length / allDrops.length) * 100 
        : 0;
      
      const pickupRate = allDrops.length > 0 
        ? (pickedUpDrops.length / allDrops.length) * 100 
        : 0;
      
      res.json({
        organization: {
          id: membership.organization.id,
          name: membership.organization.name,
        },
        team: {
          totalMembers: members.length,
          admins: adminCount,
          rms: rmCount,
          agents: agentCount,
        },
        drops: {
          total: allDrops.length,
          pending: pendingDrops.length,
          pickedUp: pickedUpDrops.length,
          converted: convertedDrops.length,
          todaysPickups: todaysPickups.length,
          overduePickups: overduePickups.length,
        },
        performance: {
          conversionRate: Math.round(conversionRate * 10) / 10,
          pickupRate: Math.round(pickupRate * 10) / 10,
        },
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  // Admin Dashboard API - Get all drops in organization (master_admin only)
  app.get("/api/admin/drops", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const members = await storage.getOrganizationMembers(membership.organization.id);
      
      const agentIds = members.map(m => m.userId);
      const allDrops = await storage.getDropsByOrganization(agentIds);
      
      res.json(allDrops);
    } catch (error) {
      console.error("Error fetching admin drops:", error);
      res.status(500).json({ error: "Failed to fetch admin drops" });
    }
  });

  // Admin Dashboard API - Seed demo deals for testing/training (master_admin only)
  app.post("/api/admin/seed-demo-deals", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const userId = req.user.claims.sub;
      const orgId = membership.organization.id;
      
      const result = await seedDemoDeals(orgId, userId);
      
      if (result.skipped) {
        return res.status(200).json({
          success: true,
          message: "Demo deals already exist for this organization",
          created: 0,
          skipped: true,
        });
      }
      
      res.status(201).json({
        success: true,
        message: `Successfully created ${result.created} demo deals across all pipeline stages`,
        created: result.created,
        skipped: false,
      });
    } catch (error) {
      console.error("Error seeding demo deals:", error);
      res.status(500).json({ error: "Failed to seed demo deals" });
    }
  });

  // Admin Dashboard API - Check if demo deals exist (master_admin only)
  app.get("/api/admin/demo-deals/status", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const orgId = membership.organization.id;
      
      const exists = await checkDemoDealsExist(orgId);
      
      res.json({
        exists,
        message: exists ? "Demo deals exist in this organization" : "No demo deals found",
      });
    } catch (error) {
      console.error("Error checking demo deals status:", error);
      res.status(500).json({ error: "Failed to check demo deals status" });
    }
  });

  // Admin Dashboard API - Delete all demo deals (master_admin only)
  app.delete("/api/admin/demo-deals", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const orgId = membership.organization.id;
      
      const deleted = await deleteDemoDeals(orgId);
      
      res.json({
        success: true,
        message: deleted > 0 ? `Successfully deleted ${deleted} demo deals` : "No demo deals found to delete",
        deleted,
      });
    } catch (error) {
      console.error("Error deleting demo deals:", error);
      res.status(500).json({ error: "Failed to delete demo deals" });
    }
  });

  // User API - Check if demo deals exist for user's organization
  app.get("/api/user/demo-deals/status", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const orgId = membership.organization.id;
      
      const exists = await checkDemoDealsExist(orgId);
      
      res.json({
        exists,
        message: exists ? "Demo deals exist in this organization" : "No demo deals found",
      });
    } catch (error) {
      console.error("Error checking demo deals status:", error);
      res.status(500).json({ error: "Failed to check demo deals status" });
    }
  });

  // User API - Seed demo deals for user's organization (any logged in user can trigger)
  app.post("/api/user/demo-deals/seed", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const userId = req.user.claims.sub;
      const orgId = membership.organization.id;
      
      const result = await seedDemoDeals(orgId, userId);
      
      if (result.skipped) {
        return res.status(200).json({
          success: true,
          message: "Demo deals already exist for this organization",
          created: 0,
          skipped: true,
        });
      }
      
      res.status(201).json({
        success: true,
        message: `Successfully created ${result.created} demo deals across all pipeline stages`,
        created: result.created,
        skipped: false,
      });
    } catch (error) {
      console.error("Error seeding demo deals:", error);
      res.status(500).json({ error: "Failed to seed demo deals" });
    }
  });

  // User API - Delete demo deals for user's organization (any logged in user can delete)
  app.delete("/api/user/demo-deals", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const orgId = membership.organization.id;
      
      const deleted = await deleteDemoDeals(orgId);
      
      res.json({
        success: true,
        message: deleted > 0 ? `Successfully deleted ${deleted} demo deals` : "No demo deals found to delete",
        deleted,
      });
    } catch (error) {
      console.error("Error deleting demo deals:", error);
      res.status(500).json({ error: "Failed to delete demo deals" });
    }
  });

  // Bulk API - Seed demo deals for all active organizations (internal/admin only)
  app.post("/api/internal/seed-all-demo-deals", async (req, res) => {
    const internalSecret = req.headers["x-internal-secret"];
    if (internalSecret !== process.env.INTERNAL_SECRET && process.env.NODE_ENV !== "development") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    try {
      const orgs = await db.select({ id: organizations.id }).from(organizations);
      
      let totalCreated = 0;
      let orgsSeeded = 0;
      let orgsSkipped = 0;
      
      for (const org of orgs) {
        const members = await storage.getOrganizationMembers(org.id);
        const firstMember = members[0];
        if (firstMember && firstMember.userId) {
          const result = await seedDemoDeals(org.id, firstMember.userId);
          if (result.skipped) {
            orgsSkipped++;
          } else {
            totalCreated += result.created;
            orgsSeeded++;
          }
        }
      }
      
      res.json({
        success: true,
        message: `Seeded ${totalCreated} demo deals across ${orgsSeeded} organizations (${orgsSkipped} already had demo data)`,
        totalCreated,
        orgsSeeded,
        orgsSkipped,
      });
    } catch (error) {
      console.error("Error bulk seeding demo deals:", error);
      res.status(500).json({ error: "Failed to bulk seed demo deals" });
    }
  });

  // RM Dashboard API - Get agents assigned to this RM
  app.get("/api/rm/agents", isAuthenticated, requireRole("relationship_manager"), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const agents = await storage.getAgentsByManager(membership.id);
      res.json(agents);
    } catch (error) {
      console.error("Error fetching RM agents:", error);
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  // RM Dashboard API - Get all drops from agents under this RM
  app.get("/api/rm/drops", isAuthenticated, requireRole("relationship_manager"), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const agents = await storage.getAgentsByManager(membership.id);
      
      const agentIds = agents.map(a => a.userId);
      const allDrops = await storage.getDropsByOrganization(agentIds);
      
      res.json(allDrops);
    } catch (error) {
      console.error("Error fetching RM drops:", error);
      res.status(500).json({ error: "Failed to fetch drops" });
    }
  });

  // RM Dashboard API - Get stats for RM's team
  app.get("/api/rm/stats", isAuthenticated, requireRole("relationship_manager"), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const agents = await storage.getAgentsByManager(membership.id);
      
      const agentIds = agents.map(a => a.userId);
      const allDrops = await storage.getDropsByOrganization(agentIds);
      
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
      
      const pendingDrops = allDrops.filter(d => d.status === "pending");
      const convertedDrops = allDrops.filter(d => d.status === "converted");
      const pickedUpDrops = allDrops.filter(d => d.status === "picked_up" || d.status === "converted");
      
      const todaysPickups = pendingDrops.filter(d => {
        if (!d.pickupScheduledFor) return false;
        const pickup = new Date(d.pickupScheduledFor);
        return pickup >= startOfToday && pickup < endOfToday;
      });
      
      const overduePickups = pendingDrops.filter(d => {
        if (!d.pickupScheduledFor) return false;
        const pickup = new Date(d.pickupScheduledFor);
        return pickup < startOfToday;
      });
      
      const conversionRate = allDrops.length > 0 
        ? (convertedDrops.length / allDrops.length) * 100 
        : 0;
      
      const pickupRate = allDrops.length > 0 
        ? (pickedUpDrops.length / allDrops.length) * 100 
        : 0;
      
      res.json({
        organization: {
          id: membership.organization.id,
          name: membership.organization.name,
        },
        team: {
          totalAgents: agents.length,
        },
        drops: {
          total: allDrops.length,
          pending: pendingDrops.length,
          pickedUp: pickedUpDrops.length,
          converted: convertedDrops.length,
          todaysPickups: todaysPickups.length,
          overduePickups: overduePickups.length,
        },
        performance: {
          conversionRate: Math.round(conversionRate * 10) / 10,
          pickupRate: Math.round(pickupRate * 10) / 10,
        },
      });
    } catch (error) {
      console.error("Error fetching RM stats:", error);
      res.status(500).json({ error: "Failed to fetch RM stats" });
    }
  });

  // RM Dashboard API - Get drops for a specific agent (RM can view their agents' drops)
  app.get("/api/rm/agents/:agentId/drops", isAuthenticated, requireRole("relationship_manager"), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const agentUserId = req.params.agentId;
      
      // Verify this agent belongs to this RM
      const agents = await storage.getAgentsByManager(membership.id);
      const agent = agents.find(a => a.userId === agentUserId);
      
      if (!agent) {
        return res.status(403).json({ error: "Access denied: Agent is not managed by you" });
      }
      
      const drops = await storage.getDropsByAgent(agentUserId);
      res.json(drops);
    } catch (error) {
      console.error("Error fetching agent drops:", error);
      res.status(500).json({ error: "Failed to fetch agent drops" });
    }
  });

  // Email Polish API - Uses AI to polish draft emails
  // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
  app.post("/api/email/polish", isAuthenticated, async (req: any, res) => {
    try {
      const { draft, tone, context } = req.body;
      
      if (!draft || draft.trim().length === 0) {
        return res.status(400).json({ error: "Email draft is required" });
      }
      
      const client = getAIIntegrationsClient();
      
      const systemPrompt = `You are a professional email writing assistant for sales representatives. 
Your job is to take a rough draft email and polish it to be professional, clear, and persuasive.

Guidelines:
- Maintain the original intent and key points
- Make it professional but friendly
- Keep it concise and easy to read
- Use proper grammar and punctuation
- Include a clear call-to-action when appropriate
- Tone should be: ${tone || "professional and friendly"}
${context ? `Context: ${context}` : ""}

Return ONLY the polished email text, no explanations or meta-commentary.`;

      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please polish this email draft:\n\n${draft}` }
        ],
        max_completion_tokens: 1024,
      });
      
      const polishedEmail = response.choices[0]?.message?.content || draft;
      
      res.json({ polishedEmail });
    } catch (error) {
      console.error("Error polishing email:", error);
      res.status(500).json({ error: "Failed to polish email" });
    }
  });

  // Generate email from scratch based on context
  app.post("/api/email/generate", isAuthenticated, async (req: any, res) => {
    try {
      const { businessName, contactName, purpose, keyPoints, tone, businessType, agentNotes } = req.body;
      
      if (!businessName || !purpose) {
        return res.status(400).json({ error: "Business name and purpose are required" });
      }
      
      const client = getAIIntegrationsClient();
      
      let systemPrompt: string;
      let userPrompt: string;
      
      if (businessType && agentNotes) {
        systemPrompt = getEmailPrompt(
          businessName,
          contactName || "",
          businessType,
          agentNotes,
          purpose,
          tone || "professional"
        );
        userPrompt = "Generate the email based on the context provided above.";
      } else {
        systemPrompt = `You are a professional email writing assistant for sales representatives in the payment processing industry.
Generate a professional, persuasive email based on the provided context.

Guidelines:
- Be professional but friendly
- Keep it concise (under 200 words)
- Include a clear call-to-action
- Personalize when contact name is provided
- Tone should be: ${tone || "professional and friendly"}

Return ONLY the email text, no subject line, no explanations.`;

        userPrompt = `Generate an email for:
Business: ${businessName}
${contactName ? `Contact: ${contactName}` : ""}
Purpose: ${purpose}
${keyPoints ? `Key points to include: ${keyPoints}` : ""}`;
      }

      console.log("Email generation request:", { businessName, businessType, purpose, hasAgentNotes: !!agentNotes });
      
      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_completion_tokens: 2048,
      });
      
      const generatedEmail = response.choices[0]?.message?.content || "";
      
      console.log("Email generation response:", { 
        hasContent: !!generatedEmail, 
        contentLength: generatedEmail.length,
        finishReason: response.choices[0]?.finish_reason 
      });
      
      if (!generatedEmail) {
        console.warn("AI returned empty email response");
      }
      
      res.json({ email: generatedEmail });
    } catch (error) {
      console.error("Error generating email:", error);
      res.status(500).json({ error: "Failed to generate email" });
    }
  });

  // AI Generate Text Message
  app.post("/api/text/generate", isAuthenticated, async (req: any, res) => {
    try {
      const { businessName, contactName, purpose, keyPoints, tone } = req.body;
      
      if (!businessName || !purpose) {
        return res.status(400).json({ error: "Business name and purpose are required" });
      }
      
      const client = getAIIntegrationsClient();
      
      const systemPrompt = `You are a professional text message writing assistant for sales representatives in the payment processing industry.
Generate a brief, professional text message based on the provided context.

Guidelines:
- Keep it VERY concise (under 160 characters if possible, max 320 characters)
- Be professional but conversational (texting style)
- Include a clear call-to-action when appropriate
- Don't be overly formal - it's a text, not an email
- Don't include signature or greeting like "Dear"
- Use first name if contact name is provided
- Tone should be: ${tone || "friendly and professional"}

Return ONLY the text message, no explanations or alternatives.`;

      const userPrompt = `Generate a text message for:
Business: ${businessName}
${contactName ? `Contact: ${contactName}` : ""}
Purpose: ${purpose}
${keyPoints ? `Key points to include: ${keyPoints}` : ""}`;

      console.log("Text message generation request:", { businessName, purpose });
      
      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.7,
      });
      
      const generatedText = response.choices[0]?.message?.content?.trim() || "";
      
      console.log("Text message generation response:", { 
        contentLength: generatedText.length,
        finishReason: response.choices[0]?.finish_reason 
      });
      
      res.json({ text: generatedText });
    } catch (error) {
      console.error("Error generating text message:", error);
      res.status(500).json({ error: "Failed to generate text message" });
    }
  });

  // AI Polish Text Message
  app.post("/api/text/polish", isAuthenticated, async (req: any, res) => {
    try {
      const { draft, tone, context } = req.body;
      
      if (!draft) {
        return res.status(400).json({ error: "Draft text is required" });
      }
      
      const client = getAIIntegrationsClient();
      
      const systemPrompt = `You are a professional text message editor for sales representatives.
Your job is to polish and improve draft text messages while keeping them concise and professional.

Guidelines:
- Keep it VERY concise (under 160 characters if possible, max 320 characters)
- Maintain the original intent and key points
- Make it sound natural for texting (not too formal)
- Improve clarity and impact
- Tone should be: ${tone || "friendly and professional"}
${context ? `Context: ${context}` : ""}

Return ONLY the polished text message, no explanations.`;

      const userPrompt = `Polish this text message while keeping the core message:\n\n${draft}`;
      
      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.7,
      });
      
      const polishedText = response.choices[0]?.message?.content?.trim() || "";
      
      res.json({ text: polishedText });
    } catch (error) {
      console.error("Error polishing text message:", error);
      res.status(500).json({ error: "Failed to polish text message" });
    }
  });

  // AI Draft Email for Referrals - generates subject and body based on email type
  app.post("/api/ai/draft-email", isAuthenticated, async (req: any, res) => {
    try {
      const { referralId, emailType, customInstructions, context } = req.body;
      
      if (!emailType) {
        return res.status(400).json({ error: "Email type is required" });
      }
      
      const validEmailTypes = ["introduction", "follow_up", "thank_you", "meeting_request"];
      if (!validEmailTypes.includes(emailType)) {
        return res.status(400).json({ error: `Invalid email type. Must be one of: ${validEmailTypes.join(", ")}` });
      }
      
      // Get referral data if referralId is provided
      let referral = null;
      if (referralId) {
        referral = await storage.getReferral(referralId);
        if (!referral) {
          return res.status(404).json({ error: "Referral not found" });
        }
      }
      
      const businessName = context?.businessName || referral?.referredBusinessName || "the business";
      const contactName = context?.contactName || referral?.referredContactName || "";
      const notes = context?.notes || referral?.notes || "";
      const phone = context?.phone || referral?.referredPhone || "";
      
      const client = getAIIntegrationsClient();
      
      const emailTypeDescriptions: Record<string, string> = {
        introduction: "an introductory email to establish first contact and introduce your payment processing services",
        follow_up: "a follow-up email to check in after a previous conversation or visit",
        thank_you: "a thank you email to express gratitude for their time or consideration",
        meeting_request: "a meeting request email to schedule a time to discuss payment processing solutions",
      };
      
      const systemPrompt = `You are a professional email writing assistant for sales representatives in the payment processing industry.
Generate a professional, persuasive email based on the provided context.

You MUST respond with valid JSON in this exact format:
{
  "subject": "The email subject line",
  "body": "The full email body text"
}

Guidelines:
- Be professional but friendly and approachable
- Keep the email concise (under 200 words for the body)
- Include a clear call-to-action appropriate for the email type
- Personalize with the contact name when provided
- Focus on value proposition and building relationships
- Do not use overly salesy language
- Sign off as "[Your Name]" placeholder for the sender to fill in

${customInstructions ? `Additional instructions: ${customInstructions}` : ""}

Return ONLY the JSON object, no additional text or markdown.`;

      const userPrompt = `Generate ${emailTypeDescriptions[emailType]} for:
Business: ${businessName}
${contactName ? `Contact: ${contactName}` : ""}
${phone ? `Phone: ${phone}` : ""}
${notes ? `Notes/Context: ${notes}` : ""}`;

      console.log("AI Draft Email request:", { emailType, businessName, hasContext: !!context });
      
      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_completion_tokens: 2048,
      });
      
      const responseContent = response.choices[0]?.message?.content || "";
      
      console.log("AI Draft Email response:", { 
        hasContent: !!responseContent, 
        contentLength: responseContent.length,
        finishReason: response.choices[0]?.finish_reason 
      });
      
      // Parse the JSON response
      let parsedResponse;
      try {
        // Try to extract JSON from the response (handling potential markdown code blocks)
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", parseError);
        // Fallback: create a basic response from the content
        parsedResponse = {
          subject: `${emailType.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} - ${businessName}`,
          body: responseContent
        };
      }
      
      res.json({
        subject: parsedResponse.subject || "",
        body: parsedResponse.body || ""
      });
    } catch (error) {
      console.error("Error generating draft email:", error);
      res.status(500).json({ error: "Failed to generate draft email" });
    }
  });

  // AI Analyze Deal - generates summary and key takeaways for a deal
  app.post("/api/ai/analyze-deal", isAuthenticated, async (req: any, res) => {
    try {
      const { businessName, notes, stage, temperature, followUpCount } = req.body;
      
      if (!businessName) {
        return res.status(400).json({ error: "Business name is required" });
      }
      
      const client = getAIIntegrationsClient();
      
      const systemPrompt = `You are an expert sales analyst. Analyze the provided deal information and generate insights.

You MUST respond with valid JSON in this exact format:
{
  "sentiment": "positive" | "neutral" | "negative",
  "summary": "A brief 2-3 sentence summary of the deal status and prospects",
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"]
}

Consider:
- The deal stage and what it indicates about progress
- The temperature (hot/warm/cold) and engagement level
- Any notes provided about the business
- The number of follow-up attempts made`;

      const userMessage = `Analyze this deal:
Business: ${businessName}
Stage: ${stage || "prospect"}
Temperature: ${temperature || "warm"}
Follow-up attempts: ${followUpCount || 0}
Notes: ${notes || "No notes provided"}`;

      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        max_tokens: 1000,
      });
      
      const responseContent = response.choices[0]?.message?.content || "";
      
      let parsedResponse;
      try {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", parseError);
        parsedResponse = {
          sentiment: "neutral",
          summary: "Unable to generate summary at this time.",
          keyTakeaways: []
        };
      }
      
      res.json(parsedResponse);
    } catch (error) {
      console.error("Error analyzing deal:", error);
      res.status(500).json({ error: "Failed to analyze deal" });
    }
  });

  // AI Prospecting Advice Coach - generates actionable prospecting ideas
  // Uses training materials from Google Drive for RAG-enhanced responses
  app.post("/api/prospecting-advice", isAuthenticated, async (req: any, res) => {
    try {
      const { userInput } = req.body;
      
      if (!userInput || typeof userInput !== "string") {
        return res.status(400).json({ error: "User input is required" });
      }
      
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
        httpOptions: {
          apiVersion: "",
          baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
        },
      });
      
      // Fetch custom training materials - prefer database (faster), fallback to Google Drive
      let trainingKnowledge = '';
      try {
        // First, try to get training materials from database (already synced from Google Drive)
        trainingKnowledge = await storage.getTrainingKnowledgeContext();
        if (trainingKnowledge) {
          console.log("[SalesSpark] Loaded training materials from database");
        }
        
        // If database is empty, fallback to Google Drive with timeout
        if (!trainingKnowledge) {
          const drivePromise = buildDriveKnowledgeContext();
          const timeoutPromise = new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('Drive fetch timeout')), 10000)
          );
          trainingKnowledge = await Promise.race([drivePromise, timeoutPromise]);
          if (trainingKnowledge) {
            console.log("[SalesSpark] Loaded training materials from Google Drive (database was empty)");
          }
        }
      } catch (driveError: any) {
        console.log("[SalesSpark] Training materials unavailable, using built-in knowledge only:", driveError?.message || driveError);
      }
      
      const businessContext = `
You are an expert sales coach for a merchant services/payment processing company called PCBancard.

WHAT WE SELL:
- Payment processing solutions (credit card processing, POS systems)
- Cash discount/dual pricing programs that eliminate processing fees for merchants
- Video brochures as innovative sales tools for pattern interrupt prospecting
- Full-service merchant accounts with competitive rates and transparent pricing

OUR VALUE PROPOSITIONS:
1. COST SAVINGS: We can typically save merchants 20-40% on processing fees or eliminate them entirely with dual pricing
2. NO LONG-TERM CONTRACTS: Month-to-month agreements, no early termination fees
3. TRANSPARENT PRICING: No hidden fees, no junk fees, clear statements
4. LOCAL SERVICE: Dedicated local rep vs. 1-800 number support
5. FAST FUNDING: Next-day or same-day funding available
6. FREE EQUIPMENT: POS terminals, card readers, etc.

IDEAL PROSPECT TYPES:
- Restaurants, bars, cafes (high volume, high ticket)
- Retail stores (clothing, specialty shops, convenience stores)
- Auto repair shops, mechanics
- Medical/dental offices
- Salons, barbershops, spas
- Professional services (attorneys, accountants)
- B2B businesses
- Any business currently paying processing fees

OBJECTION HANDLING BASICS:
- "I'm in a contract" → We can often help buy out contracts, or set up for future switch
- "I'm happy with my processor" → Great! Mind if I do a free statement analysis just to make sure you're getting the best deal?
- "I don't have time" → This takes 5 minutes and could save you thousands per year
- "I just switched" → Perfect time to make sure you got what you were promised - free analysis
`;

      const prompt = `${businessContext}
${trainingKnowledge}

---

A salesperson on our team is reaching out for help. Here's what they said:

"${userInput}"

---

Based on what they're experiencing, provide SPECIFIC, ACTIONABLE prospecting advice for TODAY.

IMPORTANT: If custom training materials were provided above, incorporate specific strategies, scripts, and techniques from those materials into your advice. These are proven methods from our top performers.

Your response should:
1. ACKNOWLEDGE their situation briefly (1 sentence)
2. Provide 3-5 SPECIFIC, ACTIONABLE ideas they can execute TODAY
3. Each idea should be concrete - include specific places to go, types of businesses to target, and exact words to say
4. When possible, reference specific techniques or scripts from the training materials
5. Frame everything in the context of selling payment processing and video brochure products
6. End with ONE motivational insight or mindset tip

Keep the tone encouraging but practical. These are experienced salespeople who need actionable advice, not generic platitudes.

Format the response clearly with numbered action items. Be specific - instead of "visit local businesses," say "Walk into 5 restaurants on Main Street during the slow 2-4pm window and ask to speak with the owner about their processing statement."`;

      console.log("[SalesSpark] Prospecting Advice request received:", { inputLength: userInput.length, hasTrainingKnowledge: trainingKnowledge.length > 0 });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      });

      const advice = response.text || "";
      console.log("Prospecting Advice generated:", { adviceLength: advice.length });
      
      res.json({ advice });
    } catch (error) {
      console.error("Error generating prospecting advice:", error);
      res.status(500).json({ error: "Failed to generate prospecting advice" });
    }
  });

  // ============================================
  // MERCHANTS API (Merchant Profiles)
  // ============================================
  
  app.get("/api/merchants", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = await getEffectiveUserId(req);
      const orgId = membership.organization.id;
      
      let merchants;
      
      // Data isolation based on role
      if (membership.role === "master_admin") {
        // Admins see all merchants in organization
        merchants = await storage.getMerchantsByOrg(orgId);
      } else if (membership.role === "relationship_manager") {
        // Managers see merchants from their drops + their agents' drops
        const teamMembers = await storage.getAgentsByManager(membership.id);
        const teamAgentIds = [userId, ...teamMembers.map(m => m.userId)];
        merchants = await storage.getMerchantsByAgentIds(orgId, teamAgentIds);
      } else {
        // Agents see only merchants from their own drops
        merchants = await storage.getMerchantsByAgentIds(orgId, [userId]);
      }
      
      res.json(merchants);
    } catch (error) {
      console.error("Error fetching merchants:", error);
      res.status(500).json({ error: "Failed to fetch merchants" });
    }
  });

  // Export merchants - MUST be before /api/merchants/:id to avoid route conflict
  app.get("/api/merchants/export", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = await getEffectiveUserId(req);
      const orgId = membership.organization.id;
      const format = (req.query.format as ExportFormat) || "csv";
      
      if (!["csv", "xlsx"].includes(format)) {
        return res.status(400).json({ error: "Invalid format. Use 'csv' or 'xlsx'" });
      }
      
      // Data isolation based on role
      let merchants;
      if (membership.role === "master_admin") {
        merchants = await storage.getMerchantsByOrg(orgId);
      } else if (membership.role === "relationship_manager") {
        const teamMembers = await storage.getAgentsByManager(membership.id);
        const teamAgentIds = [userId, ...teamMembers.map(m => m.userId)];
        merchants = await storage.getMerchantsByAgentIds(orgId, teamAgentIds);
      } else {
        merchants = await storage.getMerchantsByAgentIds(orgId, [userId]);
      }
      
      const filename = `merchants_export_${new Date().toISOString().split("T")[0]}`;
      const buffer = await exportMerchants(merchants, { format, filename });
      
      const contentType = format === "csv" 
        ? "text/csv; charset=utf-8"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const extension = format === "csv" ? "csv" : "xlsx";
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.${extension}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting merchants:", error);
      res.status(500).json({ error: "Failed to export merchants" });
    }
  });

  app.get("/api/merchants/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const merchantId = parseInt(req.params.id);
      if (isNaN(merchantId)) {
        return res.status(400).json({ error: "Invalid merchant ID" });
      }
      
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      // Verify merchant belongs to user's org
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;
      const orgId = membership.organization.id;
      
      if (merchant.orgId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Data isolation based on role (verify user can access this specific merchant)
      if (membership.role !== "master_admin") {
        let allowedAgentIds: string[] = [];
        
        if (membership.role === "relationship_manager") {
          const teamMembers = await storage.getAgentsByManager(membership.id);
          allowedAgentIds = [userId, ...teamMembers.map(m => m.userId)];
        } else {
          allowedAgentIds = [userId];
        }
        
        // First check if merchant was created by an allowed agent
        const isCreatedByAllowed = merchant.createdBy && allowedAgentIds.includes(merchant.createdBy);
        
        if (!isCreatedByAllowed) {
          // Also check if merchant has drops from allowed agents (legacy support)
          const allowedMerchants = await storage.getMerchantsByAgentIds(orgId, allowedAgentIds);
          const hasAccess = allowedMerchants.some(m => m.id === merchantId);
          
          if (!hasAccess) {
            return res.status(403).json({ error: "Access denied" });
          }
        }
      }
      
      res.json(merchant);
    } catch (error) {
      console.error("Error fetching merchant:", error);
      res.status(500).json({ error: "Failed to fetch merchant" });
    }
  });

  app.post("/api/merchants", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const userId = req.user.claims.sub;
      const data = { 
        ...req.body, 
        orgId: membership.organization.id,
        createdBy: userId,
      };
      
      const parsed = insertMerchantSchema.safeParse(data);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      const merchant = await storage.createMerchant(parsed.data);
      res.status(201).json(merchant);
    } catch (error) {
      console.error("Error creating merchant:", error);
      res.status(500).json({ error: "Failed to create merchant" });
    }
  });

  app.patch("/api/merchants/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const merchantId = parseInt(req.params.id);
      if (isNaN(merchantId)) {
        return res.status(400).json({ error: "Invalid merchant ID" });
      }
      
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const membership = req.orgMembership;
      if (merchant.orgId !== membership.organization.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updated = await storage.updateMerchant(merchantId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating merchant:", error);
      res.status(500).json({ error: "Failed to update merchant" });
    }
  });

  // Delete a merchant (only if user created it or it's a sample)
  app.delete("/api/merchants/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const merchantId = parseInt(req.params.id);
      if (isNaN(merchantId)) {
        return res.status(400).json({ error: "Invalid merchant ID" });
      }
      
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const membership = req.orgMembership as OrgMembershipInfo;
      if (merchant.orgId !== membership.organization.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const userId = req.user.claims.sub;
      const role = membership.role;
      
      // Role-based delete permissions:
      // - master_admin: can delete any merchant in org
      // - relationship_manager: can delete own + managed agents' merchants
      // - agent: can delete own merchants only
      let canDelete = false;
      
      if (role === "master_admin") {
        canDelete = true;
      } else if (role === "relationship_manager") {
        // Check if merchant was created by this manager or one of their managed agents
        if (merchant.createdBy === userId) {
          canDelete = true;
        } else {
          // Get managed agents
          const allMembers = await storage.getOrganizationMembers(membership.organization.id);
          const rmMember = allMembers.find(m => m.userId === userId);
          if (rmMember) {
            const managedAgentIds = allMembers
              .filter(m => m.managerId === rmMember.id)
              .map(m => m.userId);
            if (managedAgentIds.includes(merchant.createdBy || '')) {
              canDelete = true;
            }
          }
        }
      } else {
        // Agent can only delete own merchants or sample merchants
        canDelete = merchant.createdBy === userId || merchant.isSample === true;
      }
      
      if (!canDelete) {
        return res.status(403).json({ error: "You don't have permission to delete this merchant" });
      }
      
      await storage.deleteMerchantWithRole(merchantId, membership.organization.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting merchant:", error);
      res.status(500).json({ error: "Failed to delete merchant" });
    }
  });

  // Get merchant drops (drops linked via merchantId)
  app.get("/api/merchants/:id/drops", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const merchantId = parseInt(req.params.id);
      if (isNaN(merchantId)) {
        return res.status(400).json({ error: "Invalid merchant ID" });
      }
      
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const membership = req.orgMembership;
      if (merchant.orgId !== membership.organization.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const drops = await storage.getDropsByMerchant(merchantId, membership.organization.id);
      res.json(drops);
    } catch (error) {
      console.error("Error fetching merchant drops:", error);
      res.status(500).json({ error: "Failed to fetch merchant drops" });
    }
  });

  // Get voice notes for a merchant
  app.get("/api/merchants/:id/voice-notes", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const merchantId = parseInt(req.params.id);
      if (isNaN(merchantId)) {
        return res.status(400).json({ error: "Invalid merchant ID" });
      }
      
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const membership = req.orgMembership;
      if (merchant.orgId !== membership.organization.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const voiceNotes = await storage.getVoiceNotesByMerchant(merchantId, membership.organization.id);
      res.json(voiceNotes);
    } catch (error) {
      console.error("Error fetching voice notes:", error);
      res.status(500).json({ error: "Failed to fetch voice notes" });
    }
  });

  // Create voice note for a merchant
  app.post("/api/merchants/:id/voice-notes", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const merchantId = parseInt(req.params.id);
      if (isNaN(merchantId)) {
        return res.status(400).json({ error: "Invalid merchant ID" });
      }
      
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const membership = req.orgMembership;
      if (merchant.orgId !== membership.organization.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { transcription, durationSeconds } = req.body;
      if (!transcription || typeof transcription !== 'string') {
        return res.status(400).json({ error: "Valid transcription string is required" });
      }
      
      const parsedDuration = durationSeconds !== undefined && durationSeconds !== null 
        ? parseInt(durationSeconds) 
        : null;
      if (parsedDuration !== null && isNaN(parsedDuration)) {
        return res.status(400).json({ error: "Duration must be a number" });
      }

      const voiceNote = await storage.createVoiceNote({
        merchantId,
        orgId: membership.organization.id,
        userId: req.user.id,
        transcription,
        durationSeconds: parsedDuration,
      });
      
      res.status(201).json(voiceNote);
    } catch (error) {
      console.error("Error creating voice note:", error);
      res.status(500).json({ error: "Failed to create voice note" });
    }
  });

  // Delete voice note
  app.delete("/api/voice-notes/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const voiceNoteId = parseInt(req.params.id);
      if (isNaN(voiceNoteId)) {
        return res.status(400).json({ error: "Invalid voice note ID" });
      }
      
      const membership = req.orgMembership;
      
      // Verify the voice note belongs to the user's organization
      const voiceNote = await storage.getVoiceNote(voiceNoteId);
      if (!voiceNote) {
        return res.status(404).json({ error: "Voice note not found" });
      }
      if (voiceNote.orgId !== membership.organization.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteVoiceNote(voiceNoteId, membership.organization.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting voice note:", error);
      res.status(500).json({ error: "Failed to delete voice note" });
    }
  });

  // Get merchant visit history (drops for this merchant - legacy, matches by business name)
  app.get("/api/merchants/:id/visits", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const merchantId = parseInt(req.params.id);
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const membership = req.orgMembership;
      if (merchant.orgId !== membership.organization.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get all members of org to fetch their drops
      const members = await storage.getOrganizationMembers(membership.organization.id);
      const agentIds = members.map(m => m.userId);
      const allDrops = await storage.getDropsByOrganization(agentIds);
      
      // Filter drops that match this merchant's business name
      const visits = allDrops.filter(d => 
        d.businessName?.toLowerCase() === merchant.businessName.toLowerCase()
      );
      
      res.json(visits);
    } catch (error) {
      console.error("Error fetching merchant visits:", error);
      res.status(500).json({ error: "Failed to fetch merchant visits" });
    }
  });

  // Get merchant meeting recordings
  app.get("/api/merchants/:id/recordings", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const merchantId = parseInt(req.params.id);
      if (isNaN(merchantId)) {
        return res.status(400).json({ error: "Invalid merchant ID" });
      }
      
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const membership = req.orgMembership;
      if (merchant.orgId !== membership.organization.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const recordings = await storage.getMeetingRecordingsByMerchant(merchantId);
      res.json(recordings);
    } catch (error) {
      console.error("Error fetching merchant recordings:", error);
      res.status(500).json({ error: "Failed to fetch merchant recordings" });
    }
  });

  // ============================================
  // MERCHANT INTELLIGENCE CACHE API
  // ============================================

  const merchantCache = getMerchantCache();

  // Get cache status for a merchant
  app.get("/api/merchants/:id/intelligence/cache-status", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const merchantId = parseInt(req.params.id);
      if (isNaN(merchantId)) {
        return res.status(400).json({ error: "Invalid merchant ID" });
      }

      // Verify merchant belongs to user's organization
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      const membership = req.orgMembership;
      if (merchant.orgId !== membership.organization.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const cacheStatus = merchantCache.getMerchantCacheStatus(merchantId);
      const config = merchantCache.getConfig();

      res.json({
        merchantId,
        cacheStatus: cacheStatus.map(s => ({
          category: s.category,
          isCached: s.cached,
          ttlRemaining: s.ttlRemaining,
          ttlRemainingFormatted: s.ttlRemaining 
            ? formatDuration(s.ttlRemaining)
            : null,
          lastUpdated: s.lastUpdated?.toISOString() || null,
          configuredTTL: merchantCache.getTTLForCategory(s.category),
          configuredTTLFormatted: formatDuration(merchantCache.getTTLForCategory(s.category)),
        })),
        config: {
          defaultTTL: formatDuration(config.defaultTTL),
          maxSize: config.maxSize,
          cleanupInterval: formatDuration(config.cleanupInterval),
        },
      });
    } catch (error) {
      console.error("Error fetching cache status:", error);
      res.status(500).json({ error: "Failed to fetch cache status" });
    }
  });

  // Refresh intelligence data for a merchant
  app.post("/api/merchants/:id/intelligence/refresh", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const merchantId = parseInt(req.params.id);
      if (isNaN(merchantId)) {
        return res.status(400).json({ error: "Invalid merchant ID" });
      }

      // Verify merchant belongs to user's organization
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      const membership = req.orgMembership;
      if (merchant.orgId !== membership.organization.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const categories = req.body.categories as CacheCategory[] | undefined;

      // If specific categories requested, invalidate only those
      if (categories && Array.isArray(categories)) {
        for (const category of categories) {
          const keyMap: Record<string, string> = {
            merchantInfo: 'info',
            businessHours: 'hours',
            reviews: 'reviews',
            competitors: 'competitors',
            pricing: 'pricing',
            socialMedia: 'social',
            contactInfo: 'contact',
            financialEstimates: 'financial',
          };
          const suffix = keyMap[category];
          if (suffix) {
            const key = merchantCache.generateKey('merchant', merchantId, suffix);
            merchantCache.delete(key);
          }
        }

        return res.json({
          success: true,
          refreshed: categories,
          refreshedAt: new Date().toISOString(),
        });
      }

      // Invalidate all cached data for this merchant
      const invalidated = merchantCache.invalidateMerchant(merchantId);

      res.json({
        success: true,
        refreshed: 'all',
        invalidatedEntries: invalidated,
        refreshedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error refreshing intelligence:", error);
      res.status(500).json({ error: "Failed to refresh intelligence" });
    }
  });

  // Invalidate cache for a merchant
  app.delete("/api/merchants/:id/intelligence/cache", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const merchantId = parseInt(req.params.id);
      if (isNaN(merchantId)) {
        return res.status(400).json({ error: "Invalid merchant ID" });
      }

      // Verify merchant belongs to user's organization
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      const membership = req.orgMembership;
      if (merchant.orgId !== membership.organization.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const invalidated = merchantCache.invalidateMerchant(merchantId);

      res.json({
        success: true,
        invalidatedEntries: invalidated,
      });
    } catch (error) {
      console.error("Error invalidating cache:", error);
      res.status(500).json({ error: "Failed to invalidate cache" });
    }
  });

  // Admin: Get overall cache statistics
  app.get("/api/admin/cache/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (membership?.role !== 'master_admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const stats = merchantCache.getStats();

      res.json({
        stats: {
          ...stats,
          hitRatePercent: (stats.hitRate * 100).toFixed(2) + '%',
          avgEntryAgeFormatted: formatDuration(stats.avgEntryAge),
        },
        config: merchantCache.getConfig(),
      });
    } catch (error) {
      console.error("Error fetching cache stats:", error);
      res.status(500).json({ error: "Failed to fetch cache stats" });
    }
  });

  // Admin: Update cache configuration
  app.post("/api/admin/cache/config", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (membership?.role !== 'master_admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const updates = req.body;
      const allowedKeys = [
        'defaultTTL',
        'merchantInfoTTL',
        'businessHoursTTL',
        'reviewsTTL',
        'competitorsTTL',
        'pricingTTL',
        'socialMediaTTL',
        'contactInfoTTL',
        'financialEstimatesTTL',
      ];

      const validUpdates: Record<string, number> = {};

      for (const [key, value] of Object.entries(updates)) {
        if (allowedKeys.includes(key) && typeof value === 'number' && value > 0) {
          validUpdates[key] = value;
        }
      }

      if (Object.keys(validUpdates).length === 0) {
        return res.status(400).json({ error: 'No valid configuration updates provided' });
      }

      merchantCache.updateConfig(validUpdates);

      res.json({
        success: true,
        updated: validUpdates,
        newConfig: merchantCache.getConfig(),
      });
    } catch (error) {
      console.error("Error updating cache config:", error);
      res.status(500).json({ error: "Failed to update cache config" });
    }
  });

  // Admin: Clear entire cache
  app.post("/api/admin/cache/clear", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (membership?.role !== 'master_admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      merchantCache.clear();

      res.json({ success: true, message: 'Cache cleared' });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  // ============================================
  // INVENTORY API (Inventory Tracking)
  // ============================================
  
  app.get("/api/inventory", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = req.orgMembership;
      const inventory = await storage.getAgentInventory(membership.organization.id, userId);
      res.json(inventory || { brochuresOnHand: 0, brochuresDeployed: 0, lowStockThreshold: 10 });
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  app.get("/api/inventory/all", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const allInventory = await storage.getAllAgentInventory(membership.organization.id);
      res.json(allInventory);
    } catch (error) {
      console.error("Error fetching all inventory:", error);
      res.status(500).json({ error: "Failed to fetch all inventory" });
    }
  });

  app.post("/api/inventory/restock", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = req.orgMembership;
      const { quantity, notes } = req.body;
      
      if (!quantity || quantity <= 0) {
        return res.status(400).json({ error: "Quantity must be positive" });
      }
      
      // Get current inventory or create new
      let inventory = await storage.getAgentInventory(membership.organization.id, userId);
      const newOnHand = (inventory?.brochuresOnHand || 0) + quantity;
      
      inventory = await storage.createOrUpdateAgentInventory({
        orgId: membership.organization.id,
        agentId: userId,
        brochuresOnHand: newOnHand,
        brochuresDeployed: inventory?.brochuresDeployed || 0,
        lowStockThreshold: inventory?.lowStockThreshold || 10,
        lastRestockAt: new Date(),
      });
      
      // Log the restock
      await storage.createInventoryLog({
        orgId: membership.organization.id,
        agentId: userId,
        changeType: "restock",
        quantity,
        notes,
      });
      
      // Create activity event
      await storage.createActivityEvent({
        orgId: membership.organization.id,
        agentId: userId,
        agentName: req.user.claims.name || req.user.claims.email,
        eventType: "inventory_restock",
        title: `Restocked ${quantity} brochures`,
        description: notes,
      });
      
      res.json(inventory);
    } catch (error) {
      console.error("Error restocking inventory:", error);
      res.status(500).json({ error: "Failed to restock inventory" });
    }
  });

  app.patch("/api/inventory/threshold", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = req.orgMembership;
      const { threshold } = req.body;
      
      if (threshold === undefined || threshold < 0) {
        return res.status(400).json({ error: "Threshold must be a positive number" });
      }
      
      let inventory = await storage.getAgentInventory(membership.organization.id, userId);
      if (!inventory) {
        inventory = await storage.createOrUpdateAgentInventory({
          orgId: membership.organization.id,
          agentId: userId,
          brochuresOnHand: 0,
          brochuresDeployed: 0,
          lowStockThreshold: threshold,
        });
      } else {
        inventory = await storage.updateAgentInventory(inventory.id, { lowStockThreshold: threshold });
      }
      
      res.json(inventory);
    } catch (error) {
      console.error("Error updating threshold:", error);
      res.status(500).json({ error: "Failed to update threshold" });
    }
  });

  app.get("/api/inventory/logs", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = req.orgMembership;
      const logs = await storage.getInventoryLogs(membership.organization.id, userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching inventory logs:", error);
      res.status(500).json({ error: "Failed to fetch inventory logs" });
    }
  });

  // ============================================
  // BROCHURE CUSTODY API (Individual Brochure Tracking)
  // ============================================
  // NOTE: GET routes for /house, /locations, /my-inventory, /assignees are defined earlier
  // to avoid conflict with /api/brochures/:id route

  // Get brochures by holder type and optional holderId
  app.get("/api/brochures/holder/:holderType/:holderId?", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const { holderType, holderId } = req.params;
      
      if (!["house", "relationship_manager", "agent"].includes(holderType)) {
        return res.status(400).json({ error: "Invalid holder type" });
      }
      
      const brochures = await storage.getBrochuresByHolder(
        membership.organization.id, 
        holderType as any, 
        holderId || undefined
      );
      res.json(brochures);
    } catch (error) {
      console.error("Error fetching brochures by holder:", error);
      res.status(500).json({ error: "Failed to fetch brochures" });
    }
  });

  // Get brochure location and details
  app.get("/api/brochures/:id/location", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const brochureId = req.params.id;
      const location = await storage.getBrochureLocation(brochureId);
      
      if (!location) {
        return res.status(404).json({ error: "Brochure not found in custody tracking" });
      }
      
      const brochure = await storage.getBrochure(brochureId);
      res.json({ ...brochure, location });
    } catch (error) {
      console.error("Error fetching brochure location:", error);
      res.status(500).json({ error: "Failed to fetch brochure location" });
    }
  });

  // Get brochure history
  app.get("/api/brochures/:id/history", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const brochureId = req.params.id;
      const history = await storage.getBrochureHistory(brochureId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching brochure history:", error);
      res.status(500).json({ error: "Failed to fetch brochure history" });
    }
  });

  // Register a new brochure to house inventory
  app.post("/api/brochures/register", isAuthenticated, requireRole("master_admin", "relationship_manager"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = req.orgMembership;
      const { brochureId, notes } = req.body;
      
      if (!brochureId || typeof brochureId !== "string") {
        return res.status(400).json({ error: "Brochure ID is required" });
      }
      
      const result = await storage.registerBrochure(
        brochureId.trim(),
        membership.organization.id,
        userId,
        notes
      );
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Error registering brochure:", error);
      res.status(500).json({ error: "Failed to register brochure" });
    }
  });

  // Bulk register brochures
  app.post("/api/brochures/register-bulk", isAuthenticated, requireRole("master_admin", "relationship_manager"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = req.orgMembership;
      const { brochureIds, notes } = req.body;
      
      if (!Array.isArray(brochureIds) || brochureIds.length === 0) {
        return res.status(400).json({ error: "Brochure IDs array is required" });
      }
      
      const results = [];
      const errors = [];
      
      for (const id of brochureIds) {
        try {
          const result = await storage.registerBrochure(
            id.trim(),
            membership.organization.id,
            userId,
            notes
          );
          results.push(result);
        } catch (error: any) {
          errors.push({ brochureId: id, error: error.message });
        }
      }
      
      res.status(201).json({ registered: results, errors });
    } catch (error) {
      console.error("Error bulk registering brochures:", error);
      res.status(500).json({ error: "Failed to register brochures" });
    }
  });

  // Transfer brochure to another holder
  app.post("/api/brochures/:id/transfer", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = req.orgMembership;
      const brochureId = req.params.id;
      const { toHolderType, toHolderId, notes } = req.body;
      
      if (!["house", "relationship_manager", "agent"].includes(toHolderType)) {
        return res.status(400).json({ error: "Invalid holder type" });
      }
      
      // Check role permissions
      const role = membership.role;
      const currentLocation = await storage.getBrochureLocation(brochureId);
      
      if (!currentLocation) {
        return res.status(404).json({ error: "Brochure not found in custody tracking" });
      }
      
      // Validate transfer permissions
      if (role === "agent") {
        // Agents can only return brochures they hold
        if (currentLocation.holderId !== userId) {
          return res.status(403).json({ error: "You can only transfer brochures you currently hold" });
        }
        if (toHolderType !== "house") {
          return res.status(403).json({ error: "Agents can only return brochures to house inventory" });
        }
      }
      
      // Determine transfer type
      let transferType = "assign";
      if (toHolderType === "house") {
        transferType = "return";
      }
      
      const result = await storage.transferBrochure(
        brochureId,
        toHolderType as any,
        toHolderId || null,
        userId,
        transferType,
        notes
      );
      
      res.json(result);
    } catch (error: any) {
      console.error("Error transferring brochure:", error);
      res.status(500).json({ error: error.message || "Failed to transfer brochure" });
    }
  });

  // Bulk transfer brochures
  app.post("/api/brochures/transfer-bulk", isAuthenticated, requireRole("master_admin", "relationship_manager"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { brochureIds, toHolderType, toHolderId, notes } = req.body;
      
      if (!Array.isArray(brochureIds) || brochureIds.length === 0) {
        return res.status(400).json({ error: "Brochure IDs array is required" });
      }
      
      if (!["house", "relationship_manager", "agent"].includes(toHolderType)) {
        return res.status(400).json({ error: "Invalid holder type" });
      }
      
      const transferType = toHolderType === "house" ? "return" : "assign";
      const results = [];
      const errors = [];
      
      for (const id of brochureIds) {
        try {
          const result = await storage.transferBrochure(
            id,
            toHolderType as any,
            toHolderId || null,
            userId,
            transferType,
            notes
          );
          results.push(result);
        } catch (error: any) {
          errors.push({ brochureId: id, error: error.message });
        }
      }
      
      res.json({ transferred: results, errors });
    } catch (error) {
      console.error("Error bulk transferring brochures:", error);
      res.status(500).json({ error: "Failed to transfer brochures" });
    }
  });

  // ============================================
  // REFERRALS API (Referral Tracking)
  // ============================================
  
  app.get("/api/referrals", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      let referrals;
      
      if (membership.role === "master_admin") {
        // Admins can see all org referrals, optionally filtered by agentIds
        const agentIdsParam = req.query.agentIds as string | undefined;
        if (agentIdsParam) {
          const agentIds = agentIdsParam.split(",").map(id => id.trim()).filter(id => id);
          referrals = await storage.getReferralsByAgentIds(agentIds);
        } else {
          referrals = await storage.getReferralsByOrg(membership.organization.id);
        }
      } else if (membership.role === "relationship_manager") {
        // Managers see referrals from all agents they manage plus their own
        const managedAgents = await storage.getAgentsByManager(membership.id);
        const agentIds = [userId, ...managedAgents.map(a => a.userId)];
        referrals = await storage.getReferralsByAgentIds(agentIds);
      } else {
        // Agents see only their own referrals
        referrals = await storage.getReferralsByAgent(userId);
      }
      
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ error: "Failed to fetch referrals" });
    }
  });

  app.get("/api/referrals/all", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const referrals = await storage.getReferralsByOrg(membership.organization.id);
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching all referrals:", error);
      res.status(500).json({ error: "Failed to fetch all referrals" });
    }
  });

  app.post("/api/referrals", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = req.orgMembership;
      
      const data = {
        ...req.body,
        orgId: membership.organization.id,
        agentId: userId,
        status: req.body.status || "pending",
      };
      
      const parsed = insertReferralSchema.safeParse(data);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      const referral = await storage.createReferral(parsed.data);
      
      // Create activity event
      await storage.createActivityEvent({
        orgId: membership.organization.id,
        agentId: userId,
        agentName: req.user.claims.name || req.user.claims.email,
        eventType: "referral_added",
        entityType: "referral",
        entityId: referral.id,
        title: `New referral: ${referral.referredBusinessName}`,
        description: `Referred by drop #${referral.sourceDropId}`,
      });
      
      res.status(201).json(referral);
    } catch (error) {
      console.error("Error creating referral:", error);
      res.status(500).json({ error: "Failed to create referral" });
    }
  });

  app.patch("/api/referrals/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const referralId = parseInt(req.params.id);
      if (isNaN(referralId)) {
        return res.status(400).json({ error: "Invalid referral ID" });
      }
      
      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const referral = await storage.getReferral(referralId);
      
      if (!referral) {
        return res.status(404).json({ error: "Referral not found" });
      }
      
      // Role-based access check
      let hasAccess = false;
      if (membership.role === "master_admin") {
        // Admins can update any referral in their org
        hasAccess = referral.orgId === membership.organization.id;
      } else if (membership.role === "relationship_manager") {
        // Managers can update their own referrals or those of agents they manage
        if (referral.agentId === userId) {
          hasAccess = true;
        } else {
          const managedAgents = await storage.getAgentsByManager(membership.id);
          hasAccess = managedAgents.some(a => a.userId === referral.agentId);
        }
      } else {
        // Agents can only update their own referrals
        hasAccess = referral.agentId === userId;
      }
      
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updateData = { ...req.body };
      if (req.body.status === "converted" && !referral.convertedAt) {
        updateData.convertedAt = new Date();
        
        // Create activity event for conversion
        await storage.createActivityEvent({
          orgId: membership.organization.id,
          agentId: userId,
          agentName: req.user.claims.name || req.user.claims.email,
          eventType: "referral_converted",
          entityType: "referral",
          entityId: referral.id,
          title: `Referral converted: ${referral.referredBusinessName}`,
        });
      }
      
      const updated = await storage.updateReferral(referralId, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating referral:", error);
      res.status(500).json({ error: "Failed to update referral" });
    }
  });

  app.delete("/api/referrals/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const referralId = parseInt(req.params.id);
      if (isNaN(referralId)) {
        return res.status(400).json({ error: "Invalid referral ID" });
      }
      
      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const referral = await storage.getReferral(referralId);
      
      if (!referral) {
        return res.status(404).json({ error: "Referral not found" });
      }
      
      // Role-based access check
      let hasAccess = false;
      if (membership.role === "master_admin") {
        // Admins can delete any referral in their org
        hasAccess = referral.orgId === membership.organization.id;
      } else if (membership.role === "relationship_manager") {
        // Managers can delete their own referrals or those of agents they manage
        if (referral.agentId === userId) {
          hasAccess = true;
        } else {
          const managedAgents = await storage.getAgentsByManager(membership.id);
          hasAccess = managedAgents.some(a => a.userId === referral.agentId);
        }
      } else {
        // Agents can only delete their own referrals
        hasAccess = referral.agentId === userId;
      }
      
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteReferral(referralId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting referral:", error);
      res.status(500).json({ error: "Failed to delete referral" });
    }
  });

  app.post("/api/referrals/:id/send-thank-you", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const referralId = parseInt(req.params.id);
      if (isNaN(referralId)) {
        return res.status(400).json({ error: "Invalid referral ID" });
      }
      
      const userId = req.user.claims.sub;
      const referral = await storage.getReferral(referralId);
      
      if (!referral) {
        return res.status(404).json({ error: "Referral not found" });
      }
      
      if (referral.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (!referral.referringPartyEmail) {
        return res.status(400).json({ error: "No referring party email address" });
      }
      
      const { subject, body } = req.body;
      if (!subject || !body) {
        return res.status(400).json({ error: "Subject and body are required" });
      }
      
      const senderName = req.user.claims.name || req.user.claims.email || "PCBancard Sales Intelligence Suite Team";
      const recipientName = referral.referringPartyName || "Valued Partner";
      
      const result = await sendThankYouEmail({
        to: referral.referringPartyEmail,
        recipientName,
        subject,
        body,
        senderName,
      });
      
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to send email" });
      }
      
      // Update the referral to mark thank you as sent
      const updated = await storage.updateReferral(referralId, {
        thankYouEmailSentAt: new Date(),
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error sending thank you email:", error);
      res.status(500).json({ error: "Failed to send thank you email" });
    }
  });

  // ============================================
  // EXPORT API (Data Export to CSV/Excel)
  // ============================================

  app.get("/api/referrals/export", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const format = (req.query.format as ExportFormat) || "csv";
      const status = req.query.status as string | undefined;
      
      if (!["csv", "xlsx"].includes(format)) {
        return res.status(400).json({ error: "Invalid format. Use 'csv' or 'xlsx'" });
      }
      
      let referrals;
      
      if (membership.role === "master_admin") {
        // Admins can export all org referrals, optionally filtered by agentIds
        const agentIdsParam = req.query.agentIds as string | undefined;
        if (agentIdsParam) {
          const agentIds = agentIdsParam.split(",").map(id => id.trim()).filter(id => id);
          referrals = await storage.getReferralsByAgentIds(agentIds);
        } else {
          referrals = await storage.getReferralsByOrg(membership.organization.id);
        }
      } else if (membership.role === "relationship_manager") {
        // Managers export referrals from all agents they manage plus their own
        const managedAgents = await storage.getAgentsByManager(membership.id);
        const agentIds = [userId, ...managedAgents.map(a => a.userId)];
        referrals = await storage.getReferralsByAgentIds(agentIds);
      } else {
        // Agents export only their own referrals
        referrals = await storage.getReferralsByAgent(userId);
      }
      
      if (status && status !== "all") {
        referrals = referrals.filter(r => r.status === status);
      }
      
      const filename = `referrals_export_${new Date().toISOString().split("T")[0]}`;
      const buffer = await exportReferrals(referrals, { format, filename });
      
      const contentType = format === "csv" 
        ? "text/csv; charset=utf-8"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const extension = format === "csv" ? "csv" : "xlsx";
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.${extension}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting referrals:", error);
      res.status(500).json({ error: "Failed to export referrals" });
    }
  });

  // ============================================
  // ACTIVITY FEED API (Team Activity Feed)
  // ============================================
  
  app.get("/api/activity", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Data isolation based on role
      if (membership.role === "master_admin") {
        // Admins see all activity
        const events = await storage.getActivityEventsByOrg(membership.organization.id, limit);
        res.json(events);
      } else if (membership.role === "relationship_manager") {
        // Managers see their own + team's activity
        const teamMembers = await storage.getAgentsByManager(membership.id);
        const teamAgentIds = [userId, ...teamMembers.map(m => m.userId)];
        const events = await storage.getActivityEventsByAgentIds(teamAgentIds, limit);
        res.json(events);
      } else {
        // Agents see only their own activity
        const events = await storage.getActivityEventsByAgent(userId, limit);
        res.json(events);
      }
    } catch (error) {
      console.error("Error fetching activity feed:", error);
      res.status(500).json({ error: "Failed to fetch activity feed" });
    }
  });

  app.get("/api/activity/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      const events = await storage.getActivityEventsByAgent(userId, limit);
      res.json(events);
    } catch (error) {
      console.error("Error fetching my activity:", error);
      res.status(500).json({ error: "Failed to fetch my activity" });
    }
  });

  // ============================================
  // FOLLOW-UP SEQUENCES API
  // ============================================
  
  app.get("/api/sequences", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership;
      const sequences = await storage.getFollowUpSequencesByOrg(membership.organization.id);
      res.json(sequences);
    } catch (error) {
      console.error("Error fetching sequences:", error);
      res.status(500).json({ error: "Failed to fetch sequences" });
    }
  });

  app.get("/api/sequences/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const sequenceId = parseInt(req.params.id);
      if (isNaN(sequenceId)) {
        return res.status(400).json({ error: "Invalid sequence ID" });
      }
      
      const sequence = await storage.getFollowUpSequence(sequenceId);
      if (!sequence) {
        return res.status(404).json({ error: "Sequence not found" });
      }
      
      const membership = req.orgMembership;
      if (sequence.orgId !== membership.organization.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const steps = await storage.getFollowUpSteps(sequenceId);
      res.json({ ...sequence, steps });
    } catch (error) {
      console.error("Error fetching sequence:", error);
      res.status(500).json({ error: "Failed to fetch sequence" });
    }
  });

  app.post("/api/sequences", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = req.orgMembership;
      
      const data = {
        ...req.body,
        orgId: membership.organization.id,
        createdBy: userId,
      };
      
      const parsed = insertFollowUpSequenceSchema.safeParse(data);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      const sequence = await storage.createFollowUpSequence(parsed.data);
      res.status(201).json(sequence);
    } catch (error) {
      console.error("Error creating sequence:", error);
      res.status(500).json({ error: "Failed to create sequence" });
    }
  });

  app.post("/api/sequences/:id/steps", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const sequenceId = parseInt(req.params.id);
      if (isNaN(sequenceId)) {
        return res.status(400).json({ error: "Invalid sequence ID" });
      }
      
      const sequence = await storage.getFollowUpSequence(sequenceId);
      if (!sequence) {
        return res.status(404).json({ error: "Sequence not found" });
      }
      
      const membership = req.orgMembership;
      if (sequence.orgId !== membership.organization.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const data = { ...req.body, sequenceId };
      const parsed = insertFollowUpStepSchema.safeParse(data);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      const step = await storage.createFollowUpStep(parsed.data);
      res.status(201).json(step);
    } catch (error) {
      console.error("Error creating step:", error);
      res.status(500).json({ error: "Failed to create step" });
    }
  });

  // Start a follow-up sequence for a drop
  app.post("/api/drops/:id/sequence", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const dropId = parseInt(req.params.id);
      const { sequenceId } = req.body;
      
      if (isNaN(dropId) || !sequenceId) {
        return res.status(400).json({ error: "Drop ID and sequence ID are required" });
      }
      
      const drop = await storage.getDrop(dropId);
      if (!drop) {
        return res.status(404).json({ error: "Drop not found" });
      }
      
      const userId = req.user.claims.sub;
      if (drop.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const sequence = await storage.getFollowUpSequence(sequenceId);
      if (!sequence) {
        return res.status(404).json({ error: "Sequence not found" });
      }
      
      const steps = await storage.getFollowUpSteps(sequenceId);
      if (steps.length === 0) {
        return res.status(400).json({ error: "Sequence has no steps" });
      }
      
      // Calculate next execution time based on first step
      const nextExecutionAt = new Date();
      nextExecutionAt.setDate(nextExecutionAt.getDate() + steps[0].delayDays);
      
      const execution = await storage.createFollowUpExecution({
        dropId,
        sequenceId,
        currentStep: 1,
        status: "active",
        nextExecutionAt,
      });
      
      // Create activity event
      const membership = req.orgMembership;
      await storage.createActivityEvent({
        orgId: membership.organization.id,
        agentId: userId,
        agentName: req.user.claims.name || req.user.claims.email,
        eventType: "sequence_started",
        entityType: "drop",
        entityId: dropId,
        title: `Started "${sequence.name}" sequence`,
        description: `For ${drop.businessName}`,
      });
      
      res.status(201).json(execution);
    } catch (error) {
      console.error("Error starting sequence:", error);
      res.status(500).json({ error: "Failed to start sequence" });
    }
  });

  // ============================================
  // AI SUMMARIES API (AI Call/Visit Summaries)
  // ============================================
  
  app.get("/api/drops/:id/summary", isAuthenticated, async (req: any, res) => {
    try {
      const dropId = parseInt(req.params.id);
      if (isNaN(dropId)) {
        return res.status(400).json({ error: "Invalid drop ID" });
      }
      
      const drop = await storage.getDrop(dropId);
      if (!drop) {
        return res.status(404).json({ error: "Drop not found" });
      }
      
      const userId = req.user.claims.sub;
      if (drop.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const summary = await storage.getAiSummary(dropId);
      res.json(summary || null);
    } catch (error) {
      console.error("Error fetching AI summary:", error);
      res.status(500).json({ error: "Failed to fetch AI summary" });
    }
  });

  app.post("/api/drops/:id/summary", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const dropId = parseInt(req.params.id);
      console.log(`[AI Summary] Starting for drop ${dropId}`);
      if (isNaN(dropId)) {
        return res.status(400).json({ error: "Invalid drop ID" });
      }
      
      const drop = await storage.getDrop(dropId);
      if (!drop) {
        console.log(`[AI Summary] Drop ${dropId} not found`);
        return res.status(404).json({ error: "Drop not found" });
      }
      
      const userId = req.user.claims.sub;
      console.log(`[AI Summary] User ${userId} requesting summary for drop owned by ${drop.agentId}`);
      if (drop.agentId !== userId) {
        console.log(`[AI Summary] Access denied: user ${userId} != agent ${drop.agentId}`);
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Check if there's transcript or notes to summarize
      const transcript = drop.voiceTranscript || drop.textNotes;
      if (!transcript) {
        console.log(`[AI Summary] No transcript or notes for drop ${dropId}`);
        return res.status(400).json({ error: "No transcript or notes to summarize" });
      }
      
      console.log(`[AI Summary] Calling AI for drop ${dropId} with transcript: "${transcript.substring(0, 50)}..."`);
      const client = getAIIntegrationsClient();
      
      const systemPrompt = `You are an AI assistant analyzing a sales representative's notes or voice transcript from a merchant visit.

Extract and provide:
1. A brief summary (2-3 sentences)
2. Key takeaways (bullet points)
3. Any objections or concerns mentioned
4. Recommended next steps
5. Overall sentiment (positive, neutral, or negative)
6. Whether this seems like a "hot lead" (likely to convert)

Respond in JSON format:
{
  "summary": "...",
  "keyTakeaways": ["..."],
  "objections": ["..."],
  "nextSteps": ["..."],
  "sentiment": "positive|neutral|negative",
  "hotLead": true|false
}`;

      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this merchant visit notes/transcript:\n\n${transcript}` }
        ],
        max_completion_tokens: 1024,
        response_format: { type: "json_object" }
      });
      
      const content = response.choices[0]?.message?.content;
      let parsed;
      try {
        parsed = JSON.parse(content || "{}");
      } catch {
        return res.status(500).json({ error: "Failed to parse AI response" });
      }
      
      const summary = await storage.createAiSummary({
        dropId,
        summary: parsed.summary,
        keyTakeaways: JSON.stringify(parsed.keyTakeaways || []),
        objections: JSON.stringify(parsed.objections || []),
        nextSteps: JSON.stringify(parsed.nextSteps || []),
        sentiment: parsed.sentiment,
        hotLead: parsed.hotLead || false,
      });
      
      res.status(201).json(summary);
    } catch (error) {
      console.error("Error generating AI summary:", error);
      res.status(500).json({ error: "Failed to generate AI summary" });
    }
  });

  // ============================================
  // LEAD SCORING API
  // ============================================
  
  app.get("/api/drops/:id/score", isAuthenticated, async (req: any, res) => {
    try {
      const dropId = parseInt(req.params.id);
      if (isNaN(dropId)) {
        return res.status(400).json({ error: "Invalid drop ID" });
      }
      
      const score = await storage.getLeadScore(dropId);
      res.json(score || null);
    } catch (error) {
      console.error("Error fetching lead score:", error);
      res.status(500).json({ error: "Failed to fetch lead score" });
    }
  });

  app.post("/api/drops/:id/score", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const dropId = parseInt(req.params.id);
      console.log(`[Lead Score] Starting for drop ${dropId}`);
      if (isNaN(dropId)) {
        return res.status(400).json({ error: "Invalid drop ID" });
      }
      
      const drop = await storage.getDrop(dropId);
      if (!drop) {
        console.log(`[Lead Score] Drop ${dropId} not found`);
        return res.status(404).json({ error: "Drop not found" });
      }
      
      const userId = req.user.claims.sub;
      console.log(`[Lead Score] User ${userId} requesting score for drop owned by ${drop.agentId}`);
      if (drop.agentId !== userId) {
        console.log(`[Lead Score] Access denied: user ${userId} != agent ${drop.agentId}`);
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Check if business is prohibited before calling AI
      console.log(`[Lead Score] Checking prohibited business for "${drop.businessName}"`);
      const prohibitedCheck = checkProhibitedBusiness(drop.businessName || "", drop.textNotes || "");
      if (prohibitedCheck.isProhibited) {
        const matchReasons = prohibitedCheck.matches.map(m => m.reason).join("; ");
        const leadScore = await storage.createOrUpdateLeadScore({
          dropId,
          score: 0,
          tier: "cold",
          factors: JSON.stringify([`PROHIBITED: ${matchReasons}`]),
          predictedConversion: 0,
        });
        
        return res.status(201).json({
          ...leadScore,
          factors: [`PROHIBITED: ${matchReasons}`],
          suggestions: ["This business type is prohibited under PCBancard underwriting guidelines"],
          riskLevel: "prohibited",
          isProhibited: true,
        });
      }
      
      // Get risk profile for the business type
      const riskProfile = getBusinessRiskProfile(drop.businessType || "other");
      
      const client = getAIIntegrationsClient();
      
      // Build context for scoring
      const context = {
        businessType: drop.businessType,
        businessName: drop.businessName,
        hasContactInfo: !!(drop.contactName || drop.businessPhone),
        hasNotes: !!(drop.textNotes || drop.voiceTranscript),
        hasVoiceNote: !!drop.voiceNoteUrl,
        daysSinceDropped: Math.floor((Date.now() - new Date(drop.droppedAt).getTime()) / (1000 * 60 * 60 * 24)),
        notes: drop.textNotes || "",
        voiceTranscript: drop.voiceTranscript || "",
      };
      
      const systemPrompt = `You are a lead scoring AI for PCBancard payment processing sales team.
Score this merchant lead based on the available information and PCBancard underwriting guidelines.

${UNDERWRITING_AI_CONTEXT}

Score from 0-100 where:
- 80-100: Hot lead (high conversion probability)
- 50-79: Warm lead (moderate interest)
- 0-49: Cold lead (low priority)

Consider:
- Business type and underwriting risk level
- Contact info availability
- Notes/voice notes presence (more info = better)
- Time since drop (fresher = better)
- Dual Pricing potential
- Tip handling needs

Respond in JSON format:
{
  "score": <number 0-100>,
  "tier": "hot|warm|cold",
  "factors": ["reason1", "reason2", ...],
  "predictedConversion": <number 0-1>
}`;

      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Score this lead:\n${JSON.stringify(context, null, 2)}` }
        ],
        max_completion_tokens: 512,
        response_format: { type: "json_object" }
      });
      
      const content = response.choices[0]?.message?.content;
      let parsed;
      try {
        parsed = JSON.parse(content || "{}");
      } catch {
        return res.status(500).json({ error: "Failed to parse AI response" });
      }
      
      // Apply score boost from risk profile
      const baseScore = parsed.score || 50;
      const adjustedScore = Math.max(0, Math.min(100, baseScore + riskProfile.scoreBoost));
      
      // Determine tier based on adjusted score
      let tier: "hot" | "warm" | "cold";
      if (adjustedScore >= 80) {
        tier = "hot";
      } else if (adjustedScore >= 50) {
        tier = "warm";
      } else {
        tier = "cold";
      }
      
      const factors = parsed.factors || [];
      
      // Generate agent suggestions based on business type, score, and factors
      const suggestions = generateAgentSuggestions(
        drop.businessType || "other",
        adjustedScore,
        tier,
        factors
      );
      
      // Add warning if business is flagged (but not prohibited)
      if (prohibitedCheck.isWarning) {
        prohibitedCheck.matches.forEach(m => {
          factors.unshift(`WARNING: ${m.name} - ${m.reason}`);
        });
      }
      
      const leadScore = await storage.createOrUpdateLeadScore({
        dropId,
        score: adjustedScore,
        tier,
        factors: JSON.stringify(factors),
        predictedConversion: parsed.predictedConversion,
      });
      
      res.status(201).json({
        ...leadScore,
        factors,
        suggestions,
        riskLevel: riskProfile.level,
        isProhibited: false,
      });
    } catch (error) {
      console.error("Error calculating lead score:", error);
      res.status(500).json({ error: "Failed to calculate lead score" });
    }
  });

  // ============================================
  // ROUTE OPTIMIZER API
  // ============================================
  
  app.get("/api/route/today", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const today = new Date();
      
      const drops = await storage.getDropsForRoute(userId, today);
      
      // If we have drops with locations, optimize the route
      const dropsWithLocation = drops.filter(d => d.latitude && d.longitude);
      
      if (dropsWithLocation.length <= 1) {
        // No optimization needed
        return res.json({
          optimized: false,
          drops: dropsWithLocation,
          totalDistance: null,
          estimatedTime: null,
        });
      }
      
      // Simple nearest-neighbor algorithm for route optimization
      const optimizeRoute = (locations: typeof dropsWithLocation) => {
        if (locations.length === 0) return [];
        
        const result = [locations[0]];
        const remaining = [...locations.slice(1)];
        
        while (remaining.length > 0) {
          const current = result[result.length - 1];
          let nearestIdx = 0;
          let nearestDist = Infinity;
          
          for (let i = 0; i < remaining.length; i++) {
            const dist = Math.sqrt(
              Math.pow(remaining[i].latitude! - current.latitude!, 2) +
              Math.pow(remaining[i].longitude! - current.longitude!, 2)
            );
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestIdx = i;
            }
          }
          
          result.push(remaining[nearestIdx]);
          remaining.splice(nearestIdx, 1);
        }
        
        return result;
      };
      
      const optimizedDrops = optimizeRoute(dropsWithLocation);
      
      // Estimate total distance (rough approximation using lat/lng)
      let totalDistance = 0;
      for (let i = 1; i < optimizedDrops.length; i++) {
        const prev = optimizedDrops[i - 1];
        const curr = optimizedDrops[i];
        // Approximate distance in km using Haversine-like simplification
        const latDiff = Math.abs(curr.latitude! - prev.latitude!) * 111;
        const lngDiff = Math.abs(curr.longitude! - prev.longitude!) * 85;
        totalDistance += Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
      }
      
      res.json({
        optimized: true,
        drops: optimizedDrops,
        totalDistance: Math.round(totalDistance * 10) / 10,
        estimatedTime: Math.round(optimizedDrops.length * 15 + totalDistance * 2), // rough estimate in minutes
      });
    } catch (error) {
      console.error("Error optimizing route:", error);
      res.status(500).json({ error: "Failed to optimize route" });
    }
  });

  // Get route for a specific date
  app.get("/api/route/:date", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const date = new Date(req.params.date);
      
      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: "Invalid date" });
      }
      
      const drops = await storage.getDropsForRoute(userId, date);
      res.json(drops);
    } catch (error) {
      console.error("Error fetching route drops:", error);
      res.status(500).json({ error: "Failed to fetch route drops" });
    }
  });

  // ============================================
  // OFFLINE SYNC API
  // ============================================
  
  app.post("/api/offline/sync", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { actions } = req.body;
      
      if (!Array.isArray(actions)) {
        return res.status(400).json({ error: "Actions must be an array" });
      }
      
      const results = [];
      
      for (const action of actions) {
        try {
          if (action.type === "create_drop") {
            // Create the drop
            const membership = req.orgMembership;
            let brochureId = action.payload.brochureId;
            if (!brochureId || brochureId.trim() === "") {
              const timestamp = Date.now().toString(36);
              const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
              brochureId = `MANUAL-${timestamp}-${randomPart}`;
            }
            
            let brochure = await storage.getBrochure(brochureId);
            if (!brochure) {
              brochure = await storage.createBrochure({
                id: brochureId,
                status: "deployed",
                orgId: membership.organization.id,
              });
            }
            
            const dropData = {
              ...action.payload,
              brochureId,
              agentId: userId,
              orgId: membership.organization.id,
              status: "pending",
            };
            
            const drop = await storage.createDrop(dropData);
            results.push({ localId: action.localId, serverId: drop.id, success: true });
          } else if (action.type === "update_drop") {
            const updated = await storage.updateDrop(action.dropId, action.payload);
            results.push({ localId: action.localId, success: !!updated });
          }
        } catch (err) {
          console.error("Error processing offline action:", err);
          results.push({ localId: action.localId, success: false, error: (err as Error).message });
        }
      }
      
      res.json({ results });
    } catch (error) {
      console.error("Error syncing offline data:", error);
      res.status(500).json({ error: "Failed to sync offline data" });
    }
  });

  // ============================================
  // MERCHANT INTELLIGENCE API
  // ============================================
  
  app.get("/api/merchant-intelligence", isAuthenticated, async (req: any, res) => {
    try {
      const { dealId, merchantId, dropId } = req.query;
      
      if (!dealId && !merchantId && !dropId) {
        return res.status(400).json({ error: "Must provide dealId, merchantId, or dropId" });
      }
      
      const intelligence = await storage.getMerchantIntelligence({
        dealId: dealId ? parseInt(dealId) : undefined,
        merchantId: merchantId ? parseInt(merchantId) : undefined,
        dropId: dropId ? parseInt(dropId) : undefined,
      });
      
      res.json({ intelligence: intelligence || null });
    } catch (error) {
      console.error("Error fetching merchant intelligence:", error);
      res.status(500).json({ error: "Failed to fetch merchant intelligence" });
    }
  });
  
  app.post("/api/merchant-intelligence/generate", isAuthenticated, async (req: any, res) => {
    try {
      const { dealId, merchantId, dropId } = req.body;
      
      if (!dealId && !merchantId && !dropId) {
        return res.status(400).json({ error: "Must provide dealId, merchantId, or dropId" });
      }
      
      // Import the intelligence service
      const { scrapeWebsiteIntelligence, analyzeTranscripts, buildRoleplayPersonaPrompt, buildCoachingContextSummary } = await import('./services/merchantIntelligence');
      
      // Gather base information from deal, merchant, or drop
      let websiteUrl: string | null = null;
      let baseInfo: { businessName?: string; businessType?: string; notes?: string; stage?: string; temperature?: string } = {};
      let transcripts: string[] = [];
      
      if (dealId) {
        const deal = await storage.getDeal(parseInt(dealId));
        if (deal) {
          websiteUrl = deal.website || null;
          baseInfo = {
            businessName: deal.businessName,
            businessType: deal.businessType || undefined,
            notes: deal.notes || undefined,
            stage: deal.currentStage,
            temperature: deal.temperature,
          };
          
          // Get transcripts from deal recordings
          const recordings = await storage.getMeetingRecordingsByDeal(parseInt(dealId));
          transcripts = recordings
            .filter(r => r.aiSummary)
            .map(r => r.aiSummary!)
            .slice(0, 5);
        }
      }
      
      if (merchantId) {
        const merchant = await storage.getMerchant(parseInt(merchantId));
        if (merchant) {
          baseInfo.businessName = baseInfo.businessName || merchant.businessName;
          baseInfo.businessType = baseInfo.businessType || merchant.businessType || undefined;
          baseInfo.notes = baseInfo.notes || merchant.notes || undefined;
          
          // Get merchant recordings
          const recordings = await storage.getMeetingRecordingsByMerchant(parseInt(merchantId));
          if (transcripts.length === 0) {
            transcripts = recordings
              .filter(r => r.aiSummary)
              .map(r => r.aiSummary!)
              .slice(0, 5);
          }
        }
      }
      
      if (dropId) {
        const drop = await storage.getDrop(parseInt(dropId));
        if (drop) {
          baseInfo.businessName = baseInfo.businessName || drop.businessName || undefined;
          baseInfo.businessType = baseInfo.businessType || drop.businessType || undefined;
          baseInfo.notes = baseInfo.notes || drop.textNotes || undefined;
        }
      }
      
      // Check if we already have intelligence cached
      let intelligence = await storage.getMerchantIntelligence({
        dealId: dealId ? parseInt(dealId) : undefined,
        merchantId: merchantId ? parseInt(merchantId) : undefined,
        dropId: dropId ? parseInt(dropId) : undefined,
      });
      
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // If intelligence exists and is recent, return it
      if (intelligence && intelligence.lastUpdatedAt > oneHourAgo) {
        return res.json({ intelligence, status: 'cached' });
      }
      
      // Create or update intelligence record
      if (!intelligence) {
        intelligence = await storage.createMerchantIntelligence({
          dealId: dealId ? parseInt(dealId) : null,
          merchantId: merchantId ? parseInt(merchantId) : null,
          dropId: dropId ? parseInt(dropId) : null,
          websiteUrl,
          websiteStatus: websiteUrl ? 'pending' : 'completed',
          transcriptStatus: transcripts.length > 0 ? 'pending' : 'completed',
        });
      }
      
      // Start background processing
      res.json({ 
        intelligence, 
        status: 'processing',
        message: 'Intelligence gathering started in background'
      });
      
      // Background processing (fire and forget)
      (async () => {
        try {
          let websiteIntel = null;
          let transcriptIntel = null;
          
          // Scrape website if available
          if (websiteUrl && intelligence.websiteStatus !== 'completed') {
            await storage.updateMerchantIntelligence(intelligence.id, { websiteStatus: 'scraping' });
            
            try {
              websiteIntel = await scrapeWebsiteIntelligence(websiteUrl);
              
              if (websiteIntel) {
                await storage.updateMerchantIntelligence(intelligence.id, {
                  websiteStatus: 'completed',
                  websiteScrapedAt: new Date(),
                  scrapedBusinessName: websiteIntel.businessName || null,
                  scrapedDescription: websiteIntel.description || null,
                  scrapedIndustry: websiteIntel.industry || null,
                  scrapedServices: websiteIntel.services || null,
                  scrapedHours: websiteIntel.hours || null,
                  scrapedOwnerName: websiteIntel.ownerName || null,
                  scrapedMenuItems: websiteIntel.menuItems || null,
                  scrapedPricingIndicators: websiteIntel.pricingIndicators || null,
                  scrapedUniqueSellingPoints: websiteIntel.uniqueSellingPoints || null,
                  scrapedRecentNews: websiteIntel.recentNews || null,
                  scrapedEstablishedYear: websiteIntel.establishedYear || null,
                });
              } else {
                await storage.updateMerchantIntelligence(intelligence.id, { websiteStatus: 'failed' });
              }
            } catch (scrapeError) {
              console.error('[MerchantIntelligence] Website scrape failed:', scrapeError);
              await storage.updateMerchantIntelligence(intelligence.id, { websiteStatus: 'failed' });
            }
          }
          
          // Analyze transcripts if available
          if (transcripts.length > 0 && intelligence.transcriptStatus !== 'completed') {
            await storage.updateMerchantIntelligence(intelligence.id, { transcriptStatus: 'analyzing' });
            
            try {
              transcriptIntel = await analyzeTranscripts(transcripts);
              
              if (transcriptIntel) {
                await storage.updateMerchantIntelligence(intelligence.id, {
                  transcriptStatus: 'completed',
                  transcriptAnalyzedAt: new Date(),
                  communicationStyle: transcriptIntel.communicationStyle || null,
                  decisionMakingStyle: transcriptIntel.decisionMakingStyle || null,
                  keyStakeholders: transcriptIntel.keyStakeholders || null,
                  knownObjections: transcriptIntel.knownObjections || null,
                  knownConcerns: transcriptIntel.knownConcerns || null,
                  questionsAsked: transcriptIntel.questionsAsked || null,
                  interestsExpressed: transcriptIntel.interestsExpressed || null,
                  painPoints: transcriptIntel.painPoints || null,
                });
              } else {
                await storage.updateMerchantIntelligence(intelligence.id, { transcriptStatus: 'failed' });
              }
            } catch (transcriptError) {
              console.error('[MerchantIntelligence] Transcript analysis failed:', transcriptError);
              await storage.updateMerchantIntelligence(intelligence.id, { transcriptStatus: 'failed' });
            }
          }
          
          // Generate persona prompts
          const updatedIntel = await storage.getMerchantIntelligence({ 
            dealId: dealId ? parseInt(dealId) : undefined,
            merchantId: merchantId ? parseInt(merchantId) : undefined,
            dropId: dropId ? parseInt(dropId) : undefined,
          });
          
          if (updatedIntel) {
            // Reconstruct intel objects from stored data
            const storedWebsiteIntel = updatedIntel.scrapedBusinessName ? {
              businessName: updatedIntel.scrapedBusinessName || undefined,
              description: updatedIntel.scrapedDescription || undefined,
              industry: updatedIntel.scrapedIndustry || undefined,
              services: updatedIntel.scrapedServices as string[] || undefined,
              hours: updatedIntel.scrapedHours || undefined,
              ownerName: updatedIntel.scrapedOwnerName || undefined,
              menuItems: updatedIntel.scrapedMenuItems as string[] || undefined,
              pricingIndicators: updatedIntel.scrapedPricingIndicators || undefined,
              uniqueSellingPoints: updatedIntel.scrapedUniqueSellingPoints as string[] || undefined,
              recentNews: updatedIntel.scrapedRecentNews || undefined,
              establishedYear: updatedIntel.scrapedEstablishedYear || undefined,
            } : null;
            
            const storedTranscriptIntel = updatedIntel.communicationStyle ? {
              communicationStyle: updatedIntel.communicationStyle as any,
              decisionMakingStyle: updatedIntel.decisionMakingStyle as any,
              keyStakeholders: updatedIntel.keyStakeholders as string[] || undefined,
              knownObjections: updatedIntel.knownObjections as string[] || undefined,
              knownConcerns: updatedIntel.knownConcerns as string[] || undefined,
              questionsAsked: updatedIntel.questionsAsked as string[] || undefined,
              interestsExpressed: updatedIntel.interestsExpressed as string[] || undefined,
              painPoints: updatedIntel.painPoints as string[] || undefined,
            } : null;
            
            const roleplayPrompt = buildRoleplayPersonaPrompt(baseInfo, storedWebsiteIntel, storedTranscriptIntel);
            const coachingSummary = buildCoachingContextSummary(baseInfo, storedWebsiteIntel, storedTranscriptIntel);
            
            await storage.updateMerchantIntelligence(updatedIntel.id, {
              roleplayPersonaPrompt: roleplayPrompt,
              coachingContextSummary: coachingSummary,
            });
          }
          
          console.log('[MerchantIntelligence] Background processing completed for:', baseInfo.businessName);
        } catch (bgError) {
          console.error('[MerchantIntelligence] Background processing failed:', bgError);
        }
      })();
      
    } catch (error) {
      console.error("Error generating merchant intelligence:", error);
      res.status(500).json({ error: "Failed to generate merchant intelligence" });
    }
  });

  // ============================================
  // ROLE-PLAY COACH API
  // ============================================

  app.post("/api/roleplay/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { dropId, dealId, merchantId, scenario, customObjections, mode = "roleplay", difficulty = "intermediate", persona, personaId, merchantCharacter } = req.body;

      if (!scenario || !ROLEPLAY_SCENARIOS.includes(scenario)) {
        return res.status(400).json({ 
          error: `Invalid scenario. Must be one of: ${ROLEPLAY_SCENARIOS.join(", ")}` 
        });
      }

      // Validate difficulty level
      const validDifficulties = ["beginner", "intermediate", "advanced"];
      const selectedDifficulty = validDifficulties.includes(difficulty) ? difficulty : "intermediate";

      const isCoachingMode = mode === "coaching";

      let businessContext = "";
      let merchantIntelligenceContext = "";
      let drop = null;

      // Fetch merchant intelligence if available
      if (dealId || merchantId || dropId) {
        const intelligence = await storage.getMerchantIntelligence({
          dealId: dealId ? parseInt(dealId) : undefined,
          merchantId: merchantId ? parseInt(merchantId) : undefined,
          dropId: dropId ? parseInt(dropId) : undefined,
        });
        
        if (intelligence) {
          if (isCoachingMode && intelligence.coachingContextSummary) {
            merchantIntelligenceContext = intelligence.coachingContextSummary;
          } else if (!isCoachingMode && intelligence.roleplayPersonaPrompt) {
            merchantIntelligenceContext = intelligence.roleplayPersonaPrompt;
          }
        }
      }

      // Get deal info if provided
      if (dealId) {
        const deal = await storage.getDeal(parseInt(dealId));
        if (deal) {
          businessContext = getBusinessContextPrompt(
            deal.businessType || "other",
            deal.businessName || "",
            deal.notes || ""
          );
          businessContext += `\nPipeline Stage: ${deal.currentStage}`;
          businessContext += `\nLead Temperature: ${deal.temperature}`;
          if (deal.contactName) businessContext += `\nContact: ${deal.contactName}`;
        }
      }

      if (dropId) {
        drop = await storage.getDrop(parseInt(dropId));
        if (drop && !businessContext) {
          businessContext = getBusinessContextPrompt(
            drop.businessType || "other",
            drop.businessName || "",
            drop.textNotes || ""
          );
        }
      }

      if (merchantCharacter) {
        businessContext += `\nMerchant Character: ${merchantCharacter.name} (${merchantCharacter.title} - ${merchantCharacter.businessType})`;
        businessContext += `\nPersonality: ${merchantCharacter.personality}`;
        businessContext += `\nDifficulty: ${merchantCharacter.difficulty}`;
      }

      if (customObjections) {
        businessContext += `\n\nThe agent wants to practice handling these specific objections: ${customObjections}`;
      }

      // Fetch database persona if personaId provided
      let dbPersona = null;
      if (personaId) {
        dbPersona = await storage.getRoleplayPersona(parseInt(personaId));
      }

      const session = await storage.createRoleplaySession({
        agentId: userId,
        dropId: dropId ? parseInt(dropId) : null,
        personaId: personaId ? parseInt(personaId) : null,
        scenario,
        mode: mode || "roleplay",
        businessContext: `${businessContext}\nDifficulty: ${selectedDifficulty}${merchantCharacter ? `\nMerchant: ${merchantCharacter.name} (${merchantCharacter.businessType})` : (dbPersona ? `\nPersona: ${dbPersona.name}` : (persona ? `\nPersona: ${persona}` : ''))}`,
        status: "active",
      });

      // Fetch custom training materials from database (synced from Google Drive)
      let driveKnowledge = '';
      try {
        driveKnowledge = await storage.getTrainingKnowledgeContext();
      } catch (dbError) {
        console.log('Training materials not available from database, using default materials');
      }

      // Fetch today's Daily Edge content for mindset coaching
      let dailyEdgeContext = '';
      try {
        const todaysEdge = await storage.getTodaysDailyEdge(userId);
        if (todaysEdge && todaysEdge.content) {
          dailyEdgeContext = buildDailyEdgeCoachingContext({
            belief: todaysEdge.belief,
            quote: todaysEdge.content.quote ? { content: todaysEdge.content.quote.content, source: todaysEdge.content.quote.source || undefined } : undefined,
            insight: todaysEdge.content.insight ? { content: todaysEdge.content.insight.content } : undefined,
            challenge: todaysEdge.content.challenge ? { content: todaysEdge.content.challenge.content } : undefined,
            journeyMotivator: todaysEdge.content.journey_motivator ? { content: todaysEdge.content.journey_motivator.content } : undefined,
          });
        }
      } catch (edgeError) {
        console.log('Daily Edge content not available:', edgeError);
      }

      let systemMessage: string;

      if (isCoachingMode) {
        systemMessage = `You are an expert sales coach helping a PCBancard sales agent prepare for their merchant visits. You have deep knowledge of:

${SALES_TRAINING_KNOWLEDGE.substring(0, 8000)}
${driveKnowledge}
${dailyEdgeContext}

BUSINESS CONTEXT:
${businessContext}
${merchantIntelligenceContext ? `\n${merchantIntelligenceContext}` : ''}
${merchantCharacter ? `\nMERCHANT CHARACTER CONTEXT:
The agent is preparing to meet a specific type of merchant:
- Name: ${merchantCharacter.name}
- Business: ${merchantCharacter.title} - ${merchantCharacter.businessType}
- Personality: ${merchantCharacter.personality}
- Objection Style: ${merchantCharacter.objectionStyle}
- Trigger Phrases: ${merchantCharacter.triggerPhrases?.join(', ')}
- Weak Points: ${merchantCharacter.weakPoints?.join(', ')}
Tailor your coaching advice specifically to help the agent succeed with this type of merchant.` : ''}

YOUR ROLE AS COACH:
- Answer the agent's questions about what to say, how to approach situations, and how to handle objections
- Give specific, actionable advice based on the NEPQ methodology
- Provide example scripts and phrases they can use
- Explain WHY certain approaches work better than others
- Be encouraging but also give honest, constructive feedback
- Reference specific techniques from the training materials when helpful
- Keep responses focused and practical (2-4 sentences usually, more if they ask for detailed examples)
- If they describe a situation, help them understand what to say and do
- Incorporate today's mindset focus when giving encouragement or feedback
- If merchant intelligence is available, tailor your advice to this specific merchant's situation

You're their personal sales coach. Help them succeed!`;
      } else {
        // Use database persona's systemPrompt if available, otherwise use legacy method
        let roleplaySystemPrompt: string;
        
        if (dbPersona && dbPersona.systemPrompt) {
          roleplaySystemPrompt = dbPersona.systemPrompt;
        } else if (merchantCharacter && merchantCharacter.systemPrompt) {
          roleplaySystemPrompt = merchantCharacter.systemPrompt;
        } else {
          const scenarioPrompt = getScenarioPrompt(scenario, selectedDifficulty as 'beginner' | 'intermediate' | 'advanced', persona);
          roleplaySystemPrompt = scenarioPrompt;
        }
        
        // Inject deception toolkit into system prompt
        if (!isCoachingMode) {
          try {
            const { getAdaptiveDifficulty, buildDeceptionInstructions } = await import("./trust-engine");
            const difficultyConfig = await getAdaptiveDifficulty(userId);
            const deceptionInstructions = buildDeceptionInstructions(difficultyConfig);
            roleplaySystemPrompt += "\n\n" + deceptionInstructions;
          } catch (deceptionErr) {
            console.log('[TrustEngine] Could not inject deception instructions:', deceptionErr);
          }
        }

        // Use merchant intelligence if available for more realistic role-play
        const contextSection = merchantIntelligenceContext 
          ? merchantIntelligenceContext 
          : businessContext;
        
        systemMessage = `You are playing the role of a business owner in a sales role-play training exercise.

${roleplaySystemPrompt}

${contextSection}
${!merchantIntelligenceContext && driveKnowledge ? `\nREFERENCE MATERIALS (use these to create realistic scenarios):\n${driveKnowledge.substring(0, 4000)}` : ''}

IMPORTANT GUIDELINES:
- Stay in character as the business owner at all times
- React naturally based on how the agent approaches you
- If they use good NEPQ questioning techniques (asking about your situation, problems, consequences), open up and share more
- If they pitch too hard or use pushy tactics, become resistant or skeptical
- Give realistic responses that a real business owner would give
- Include natural objections when appropriate for the scenario
- Keep responses conversational and not too long (1-3 sentences usually)
- Never break character or acknowledge you're an AI
- If the agent does well, let them progress; if they struggle, make it harder
${merchantIntelligenceContext ? '- Use the specific details about this merchant to make the role-play realistic - their actual objections, communication style, and concerns' : ''}

NEVER SAY THESE THINGS (they are unrealistic):
- "I didn't catch that" or "Could you repeat that?" - Real merchants don't say this in sales conversations
- "I'm not sure I understand" - Instead, respond naturally to what you DID understand
- Generic stalling phrases - Be specific about your concerns or reactions
- Anything that sounds like a chatbot or AI assistant

INSTEAD, respond like a REAL busy business owner would:
- "Look, I'm really busy right now..."
- "We already have a card machine, thanks."
- "What's this going to cost me?"
- "I've been burned by sales guys before..."
- "How is this different from what I already have?"

Remember: You're helping them practice real sales conversations. Be challenging but fair.`;
      }

      await storage.createRoleplayMessage({
        sessionId: session.id,
        role: "system",
        content: systemMessage,
      });

      res.status(201).json({
        sessionId: session.id,
        scenario,
        mode: isCoachingMode ? "coaching" : "roleplay",
        message: isCoachingMode 
          ? "Coaching session started. Ask me anything about sales techniques, what to say, or how to handle situations!"
          : "Role-play session started. Begin your approach!",
        hasIntelligence: !!merchantIntelligenceContext,
      });
    } catch (error) {
      console.error("Error creating roleplay session:", error);
      res.status(500).json({ error: "Failed to create roleplay session" });
    }
  });

  // Get available personas for roleplay (from database)
  app.get("/api/roleplay/personas", isAuthenticated, async (_req: any, res) => {
    try {
      const dbPersonas = await storage.getRoleplayPersonas();
      const personas = dbPersonas.map((p) => ({
        id: p.id,
        name: p.name,
        businessType: p.businessType,
        personality: p.personality,
        background: p.background,
        painPoints: p.painPoints,
        objections: p.objections,
        communicationStyle: p.communicationStyle,
        difficultyLevel: p.difficultyLevel,
        isGeneral: p.isGeneral,
      }));
      res.json({ personas });
    } catch (error) {
      console.error("Error fetching personas:", error);
      res.status(500).json({ error: "Failed to fetch personas" });
    }
  });

  // Google Drive Integration Routes
  app.get("/api/drive/status", isAuthenticated, async (_req: any, res) => {
    try {
      const connected = await isDriveConnected();
      const localDocs = await storage.getTrainingDocuments();
      res.json({ 
        connected, 
        localDocCount: localDocs.length,
        lastSynced: localDocs.length > 0 ? localDocs[0].syncedAt : null
      });
    } catch (error) {
      console.error("Error checking drive status:", error);
      res.json({ connected: false, localDocCount: 0, lastSynced: null });
    }
  });

  app.get("/api/drive/documents", isAuthenticated, async (_req: any, res) => {
    try {
      // Return locally stored documents (from database)
      const documents = await storage.getTrainingDocuments();
      res.json({ documents });
    } catch (error) {
      console.error("Error listing documents:", error);
      res.status(500).json({ error: "Failed to list documents" });
    }
  });

  // Track sync status globally
  let syncStatus: { 
    inProgress: boolean; 
    synced: number; 
    total: number; 
    errors: string[];
    lastCompleted: Date | null;
    message: string;
  } = {
    inProgress: false,
    synced: 0,
    total: 0,
    errors: [],
    lastCompleted: null,
    message: "Ready to sync"
  };

  // Get sync status
  app.get("/api/drive/sync-status", isAuthenticated, async (_req: any, res) => {
    res.json(syncStatus);
  });

  app.post("/api/drive/sync", isAuthenticated, async (_req: any, res) => {
    try {
      const connected = await isDriveConnected();
      if (!connected) {
        return res.status(400).json({ error: "Google Drive not connected" });
      }
      
      // If already syncing, return current status
      if (syncStatus.inProgress) {
        return res.json({ 
          success: true, 
          inProgress: true,
          message: "Sync already in progress",
          synced: syncStatus.synced,
          total: syncStatus.total
        });
      }
      
      // Start sync in background
      syncStatus = {
        inProgress: true,
        synced: 0,
        total: 0,
        errors: [],
        lastCompleted: null,
        message: "Starting sync..."
      };
      
      // Respond immediately
      res.json({ 
        success: true, 
        inProgress: true,
        message: "Sync started in background. Check status for progress."
      });
      
      // Run sync in background
      syncDriveToDatabase()
        .then((result) => {
          syncStatus = {
            inProgress: false,
            synced: result.synced,
            total: result.total,
            errors: result.errors,
            lastCompleted: new Date(),
            message: `Completed: synced ${result.synced}/${result.total} documents`
          };
          console.log(`Drive sync completed: ${result.synced}/${result.total} documents`);
        })
        .catch((error) => {
          syncStatus = {
            inProgress: false,
            synced: 0,
            total: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            lastCompleted: new Date(),
            message: "Sync failed"
          };
          console.error("Background sync error:", error);
        });
        
    } catch (error) {
      console.error("Error starting drive sync:", error);
      res.status(500).json({ error: "Failed to sync from Google Drive" });
    }
  });

  app.get("/api/drive/content", isAuthenticated, async (_req: any, res) => {
    try {
      // Return locally stored content from database
      const context = await storage.getTrainingKnowledgeContext();
      const documents = await storage.getTrainingDocuments();
      res.json({ 
        documents: documents.map(d => ({ name: d.name, content: d.content.substring(0, 500) + '...' })),
        totalDocs: documents.length
      });
    } catch (error) {
      console.error("Error getting content:", error);
      res.status(500).json({ error: "Failed to get content" });
    }
  });

  app.get("/api/roleplay/sessions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      const session = await storage.getRoleplaySession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const visibleMessages = session.messages.filter(m => m.role !== "system");
      res.json({ ...session, messages: visibleMessages });
    } catch (error) {
      console.error("Error fetching roleplay session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  app.post("/api/roleplay/sessions/:id/message", isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { message } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      const trimmedMessage = message.trim();
      if (trimmedMessage.length === 0) {
        return res.status(400).json({ error: "Message cannot be empty" });
      }

      if (trimmedMessage.length > 4950) {
        return res.status(400).json({ error: "Message is too long (max 4950 characters)" });
      }

      const session = await storage.getRoleplaySession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (session.status !== "active") {
        return res.status(400).json({ error: "Session is no longer active" });
      }

      await storage.createRoleplayMessage({
        sessionId,
        role: "user",
        content: trimmedMessage,
      });

      const client = getAIIntegrationsClient();

      const allMessages = await storage.getRoleplayMessages(sessionId);
      
      const systemMsg = allMessages.find(m => m.role === "system");
      const conversationMsgs = allMessages.filter(m => m.role !== "system");
      
      const recentMessages = conversationMsgs.slice(-20);
      
      const chatMessages: Array<{role: "system" | "user" | "assistant", content: string}> = [];
      
      if (systemMsg) {
        chatMessages.push({ role: "system", content: systemMsg.content });
      }
      
      if (conversationMsgs.length > 20) {
        const summaryNote = `[Previous conversation context: ${conversationMsgs.length - 20} earlier messages exchanged]`;
        chatMessages.push({ role: "system", content: summaryNote });
      }
      
      recentMessages.forEach(m => {
        chatMessages.push({ 
          role: m.role as "user" | "assistant", 
          content: m.content 
        });
      });

      let aiResponse: string | null = null;
      
      // Try up to 2 times if we get empty response
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await client.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: chatMessages,
          max_completion_tokens: 1500,
          temperature: 0.8,
        });

        aiResponse = response.choices[0]?.message?.content?.trim() || null;
        
        if (aiResponse) {
          break;
        }
        
        console.log(`AI returned empty response on attempt ${attempt + 1}, retrying...`);
      }
      
      // If still empty after retries, provide a fallback response based on mode
      if (!aiResponse) {
        console.error("AI returned empty response after retries");
        const isCoachingMode = session.mode === "coaching";
        aiResponse = isCoachingMode
          ? "I understand what you're asking. Could you rephrase that slightly so I can give you the best advice?"
          : "Hmm, let me think about that for a second... Actually, can you run that by me again?";
      }

      const savedMessage = await storage.createRoleplayMessage({
        sessionId,
        role: "assistant",
        content: aiResponse,
      });

      // Trust assessment (second AI pass)
      let trustData = null;
      const { trustScore: clientTrustScore, messageIndex } = req.body;
      if (session.mode === "roleplay") {
        try {
          const { getAdaptiveDifficulty, buildTrustAssessmentPrompt, parseTrustAssessmentResponse, getMoodBand, getMoodLabel } = await import("./trust-engine");
          
          const difficultyConfig = await getAdaptiveDifficulty(userId);
          const currentTrust = typeof clientTrustScore === 'number' ? Math.max(0, Math.min(100, clientTrustScore)) : difficultyConfig.startingTrust;
          const msgIdx = typeof messageIndex === 'number' ? messageIndex : 0;
          
          const contextMessages = recentMessages.slice(-4).map(m =>
            `${m.role === 'user' ? 'SALES REP' : 'MERCHANT'}: ${m.content}`
          ).join('\n');
          
          const assessmentPrompt = buildTrustAssessmentPrompt(
            currentTrust, msgIdx, trimmedMessage, aiResponse,
            "Merchant", contextMessages, difficultyConfig
          );

          const assessmentResponse = await client.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [{ role: "user", content: assessmentPrompt }],
            max_completion_tokens: 300,
            temperature: 0.2,
          });

          let assessmentText = assessmentResponse.choices[0]?.message?.content || '{}';
          const jsonMatch = assessmentText.match(/\{[\s\S]*\}/);
          if (jsonMatch) assessmentText = jsonMatch[0];
          const trustResult = parseTrustAssessmentResponse(assessmentText, currentTrust);
          
          trustData = {
            moodBand: trustResult.moodBand,
            moodLabel: getMoodLabel(trustResult.newScore),
            newScore: trustResult.newScore,
            delta: trustResult.trustDelta,
            deceptionDeployed: trustResult.deceptionDeployed,
            deceptionCaught: trustResult.deceptionCaught,
          };
        } catch (trustErr) {
          console.error('[TrustEngine] Coach roleplay assessment failed:', trustErr);
        }
      }

      // Generate coaching hint for roleplay mode (not coaching mode)
      let coachingHint: string | null = null;
      if (session.mode === "roleplay") {
        const conversationHistory = recentMessages.map(m => ({
          role: m.role,
          content: m.content
        }));
        coachingHint = getCoachingHint(trimmedMessage, aiResponse, conversationHistory);
      }

      res.json({
        response: aiResponse,
        messageId: savedMessage.id,
        coachingHint,
        trust: trustData,
      });
    } catch (error: any) {
      const errorMessage = error?.message || "Unknown error";
      console.error("Error in roleplay conversation:", errorMessage);
      console.error("Full error:", error);
      
      if (errorMessage.includes("rate limit") || errorMessage.includes("quota")) {
        return res.status(429).json({ error: "AI service is busy. Please try again in a moment." });
      }
      
      if (errorMessage.includes("not configured")) {
        return res.status(500).json({ error: "AI service is not available. Please contact support." });
      }
      
      res.status(500).json({ error: "Failed to process message. Please try again." });
    }
  });

  app.post("/api/roleplay/sessions/:id/speak", isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { text } = req.body;

      console.log(`TTS request: session ${sessionId}, text length: ${text?.length || 0}`);

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const session = await storage.getRoleplaySession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
      if (!elevenLabsKey) {
        console.error("ELEVENLABS_API_KEY is not configured");
        return res.status(500).json({ error: "ElevenLabs not configured" });
      }
      
      console.log(`ElevenLabs API key present: ${elevenLabsKey.length > 0}, key length: ${elevenLabsKey.length}`);

      const voiceId = "21m00Tcm4TlvDq8ikWAM";

      // Clean markdown formatting from text for natural TTS
      const cleanTextForTTS = (input: string): string => {
        return input
          .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove **bold**
          .replace(/\*([^*]+)\*/g, '$1')       // Remove *italic*
          .replace(/__([^_]+)__/g, '$1')       // Remove __bold__
          .replace(/_([^_]+)_/g, '$1')         // Remove _italic_
          .replace(/`([^`]+)`/g, '$1')         // Remove `code`
          .replace(/#{1,6}\s*/g, '')           // Remove # headers
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove [links](url)
          .replace(/\n{3,}/g, '\n\n')          // Reduce multiple newlines
          .trim();
      };

      const cleanedText = cleanTextForTTS(text);
      console.log(`Calling ElevenLabs TTS API with voice ${voiceId}...`);
      const ttsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": elevenLabsKey,
          },
          body: JSON.stringify({
            text: cleanedText,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      console.log(`ElevenLabs response status: ${ttsResponse.status}`);

      if (!ttsResponse.ok) {
        const errorText = await ttsResponse.text();
        console.error("ElevenLabs API error status:", ttsResponse.status);
        console.error("ElevenLabs error response:", errorText);
        return res.status(500).json({ error: "Failed to generate speech", details: errorText });
      }

      const audioBuffer = await ttsResponse.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString("base64");

      console.log(`TTS successful: generated ${audioBuffer.byteLength} bytes of audio`);

      res.json({
        audio: base64Audio,
        format: "audio/mpeg",
      });
    } catch (error: any) {
      console.error("Error generating speech:", error?.message || error);
      console.error("Full TTS error:", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  // Standalone TTS endpoint for listen buttons (ElevenLabs via Replit Connector)
  app.post("/api/tts", isAuthenticated, async (req: any, res) => {
    console.log("[TTS] Request received, text length:", req.body?.text?.length || 0);
    try {
      const { text } = req.body;

      if (!text) {
        console.log("[TTS] Error: No text provided");
        return res.status(400).json({ error: "Text is required" });
      }

      const result = await textToSpeech(text);
      console.log("[TTS] Success, audio size:", result.audio.length);

      res.json(result);
    } catch (error: any) {
      console.error("[TTS] Error:", error?.message || error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  // Speech-to-text endpoint for dictation (ElevenLabs via Replit Connector)
  app.post("/api/stt", isAuthenticated, multer({ storage: multer.memoryStorage() }).single("audio"), async (req: any, res) => {
    console.log("[STT] Request received");
    try {
      if (!req.file) {
        console.log("[STT] Error: No audio file provided");
        return res.status(400).json({ error: "Audio file is required" });
      }

      const audioBuffer = req.file.buffer;
      const filename = req.file.originalname || "audio.webm";
      console.log("[STT] Transcribing audio file:", filename, "size:", audioBuffer.length);

      const text = await speechToText(audioBuffer, filename);
      console.log("[STT] Success, transcribed text length:", text.length);

      res.json({ text });
    } catch (error: any) {
      console.error("[STT] Error:", error?.message || error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  // Advice Export Endpoints
  const MAX_EXPORT_CONTENT_LENGTH = 50000; // 50KB limit for content
  
  app.post("/api/export/advice-document", isAuthenticated, async (req: any, res) => {
    try {
      const { content, title, subtitle, format } = req.body;
      
      // Validate required fields
      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required and must be a non-empty string" });
      }
      
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: "Title is required and must be a non-empty string" });
      }
      
      if (format !== "pdf" && format !== "docx") {
        return res.status(400).json({ error: "Format must be 'pdf' or 'docx'" });
      }
      
      // Limit content length to prevent abuse
      if (content.length > MAX_EXPORT_CONTENT_LENGTH) {
        return res.status(400).json({ error: `Content exceeds maximum length of ${MAX_EXPORT_CONTENT_LENGTH} characters` });
      }
      
      // Sanitize inputs
      const sanitizedTitle = title.trim().substring(0, 200);
      const sanitizedSubtitle = subtitle ? String(subtitle).trim().substring(0, 500) : undefined;
      const sanitizedContent = content.trim();

      const userId = req.user?.id || req.user?.claims?.sub;
      const member = userId ? await storage.getUserMembership(userId) : undefined;
      const agentName = member ? `${member.firstName || ""} ${member.lastName || ""}`.trim() : undefined;
      
      const { generateAdvicePdf, generateAdviceWord } = await import("./services/advice-export-service");
      
      if (format === "pdf") {
        const pdfBuffer = await generateAdvicePdf({ content: sanitizedContent, title: sanitizedTitle, subtitle: sanitizedSubtitle, format: "pdf", agentName });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${sanitizedTitle.replace(/[^a-z0-9]/gi, "_")}.pdf"`);
        res.send(pdfBuffer);
      } else {
        const docxBuffer = await generateAdviceWord({ content: sanitizedContent, title: sanitizedTitle, subtitle: sanitizedSubtitle, format: "docx", agentName });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", `attachment; filename="${sanitizedTitle.replace(/[^a-z0-9]/gi, "_")}.docx"`);
        res.send(docxBuffer);
      }
    } catch (error: any) {
      console.error("[AdviceExport] Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate document" });
    }
  });

  app.post("/api/export/email-advice", isAuthenticated, async (req: any, res) => {
    try {
      const { email, content, title, subtitle } = req.body;
      
      // Validate required fields
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email address is required" });
      }
      
      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required and must be a non-empty string" });
      }
      
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: "Title is required and must be a non-empty string" });
      }
      
      // Limit content length to prevent abuse
      if (content.length > MAX_EXPORT_CONTENT_LENGTH) {
        return res.status(400).json({ error: `Content exceeds maximum length of ${MAX_EXPORT_CONTENT_LENGTH} characters` });
      }
      
      // Sanitize inputs
      const sanitizedEmail = email.trim().toLowerCase().substring(0, 254);
      const sanitizedTitle = title.trim().substring(0, 200);
      const sanitizedSubtitle = subtitle ? String(subtitle).trim().substring(0, 500) : undefined;
      const sanitizedContent = content.trim();

      const userId = req.user?.id || req.user?.claims?.sub;
      const member = userId ? await storage.getUserMembership(userId) : undefined;
      const agentName = member ? `${member.firstName || ""} ${member.lastName || ""}`.trim() : undefined;
      
      const { emailAdvice } = await import("./services/advice-export-service");
      
      await emailAdvice({ email: sanitizedEmail, content: sanitizedContent, title: sanitizedTitle, subtitle: sanitizedSubtitle, agentName });
      
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error: any) {
      console.error("[AdviceExport] Email error:", error);
      res.status(500).json({ error: error.message || "Failed to send email" });
    }
  });

  app.post("/api/roleplay/sessions/:id/end", isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      const session = await storage.getRoleplaySession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const client = getAIIntegrationsClient();

      const allMessages = await storage.getRoleplayMessages(sessionId);
      const conversationText = allMessages
        .filter(m => m.role !== "system")
        .map(m => `${m.role === "user" ? "Agent" : "Prospect"}: ${m.content}`)
        .join("\n");

      // Build enhanced feedback with psychographic/emotional/tonal analysis
      const conversationHistory = allMessages
        .filter(m => m.role !== "system")
        .map(m => ({ role: m.role, content: m.content }));
      
      const enhancedAnalysis = buildEnhancedFeedbackPrompt(conversationHistory);

      const feedbackPrompt = `You are an expert sales coach reviewing a role-play practice session using advanced analytical frameworks.

CONVERSATION:
${conversationText}

SALES TRAINING REFERENCE:
${SALES_TRAINING_KNOWLEDGE.substring(0, 3000)}

${enhancedAnalysis.prompt}

Provide constructive feedback in JSON format:
{
  "overallScore": <1-100>,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "areasToImprove": ["area 1", "area 2"],
  "nepqUsage": "Did they use NEPQ questioning techniques? How well?",
  "objectionHandling": "How did they handle objections?",
  "rapportBuilding": "Did they build rapport effectively?",
  "psychographicAdaptation": "How well did they adapt to the prospect's psychographic type?",
  "emotionalDriversUsed": ["driver1", "driver2"],
  "tonalEffectiveness": "Were tones used appropriately and at the right times?",
  "correctiveScript": "Rewrite one key moment with the correct Type → Driver → Tone formula",
  "topTip": "One specific actionable tip for their next conversation"
}`;

      const feedbackResponse = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: "You are an expert sales coach trained in psychographic classification, emotional drivers, and tonal techniques. Provide feedback in valid JSON format only." },
          { role: "user", content: feedbackPrompt }
        ],
        max_completion_tokens: 1500,
      });

      const feedbackText = feedbackResponse.choices[0]?.message?.content || "{}";
      
      let feedback;
      try {
        const jsonMatch = feedbackText.match(/\{[\s\S]*\}/);
        const parsedFeedback = jsonMatch ? JSON.parse(jsonMatch[0]) : { overallScore: 50, topTip: "Keep practicing!" };
        
        // Merge AI feedback with programmatic analysis
        feedback = {
          ...parsedFeedback,
          analysis: {
            psychographicType: enhancedAnalysis.psychographicAnalysis.detectedType,
            psychographicConfidence: Math.round(enhancedAnalysis.psychographicAnalysis.confidence * 100),
            linguisticMarkers: enhancedAnalysis.psychographicAnalysis.markers,
            driversUsed: enhancedAnalysis.driverAnalysis.usedDrivers,
            driverEffectiveness: Math.round(enhancedAnalysis.driverAnalysis.effectiveness * 100),
            missedOpportunities: enhancedAnalysis.driverAnalysis.missedOpportunities,
            tonePattern: enhancedAnalysis.tonalAnalysis.tonePattern,
            tonalAppropriateness: Math.round(enhancedAnalysis.tonalAnalysis.appropriateness * 100),
            tonalSuggestions: enhancedAnalysis.tonalAnalysis.suggestions,
          }
        };
      } catch {
        feedback = { 
          overallScore: 50, 
          topTip: "Keep practicing!",
          analysis: {
            psychographicType: enhancedAnalysis.psychographicAnalysis.detectedType || "belonger",
            psychographicConfidence: Math.round((enhancedAnalysis.psychographicAnalysis.confidence || 0) * 100),
            linguisticMarkers: enhancedAnalysis.psychographicAnalysis.markers || [],
            driversUsed: enhancedAnalysis.driverAnalysis.usedDrivers || [],
            driverEffectiveness: Math.round((enhancedAnalysis.driverAnalysis.effectiveness || 0) * 100),
            missedOpportunities: enhancedAnalysis.driverAnalysis.missedOpportunities || [],
            tonePattern: enhancedAnalysis.tonalAnalysis.tonePattern || [],
            tonalAppropriateness: Math.round((enhancedAnalysis.tonalAnalysis.appropriateness || 0) * 100),
            tonalSuggestions: enhancedAnalysis.tonalAnalysis.suggestions || [],
          }
        };
      }

      // Save trust session summary
      try {
        const { saveTrustSessionSummary, buildTrustDebrief } = await import("./trust-engine");
        const { trustHistory: clientTrustHistory } = req.body;
        if (clientTrustHistory && Array.isArray(clientTrustHistory) && clientTrustHistory.length > 0) {
          const validatedHistory = clientTrustHistory
            .filter((h: any) => typeof h?.newScore === 'number')
            .map((h: any) => ({
              ...h,
              newScore: Math.max(0, Math.min(100, h.newScore)),
              delta: typeof h.delta === 'number' ? Math.max(-20, Math.min(20, h.delta)) : 0,
            }));
          if (validatedHistory.length > 0) {
            await saveTrustSessionSummary(sessionId, "roleplay", userId, validatedHistory, "adaptive");
            const trustDebrief = buildTrustDebrief(validatedHistory, "Merchant");
            feedback.trustDebrief = trustDebrief;
          }
        }
      } catch (trustErr) {
        console.error('[TrustEngine] Failed to save trust summary:', trustErr);
      }

      const endedAt = new Date();
      await storage.updateRoleplaySession(sessionId, {
        status: "completed",
        endedAt,
        feedback: JSON.stringify(feedback),
        performanceScore: feedback.overallScore || 50,
      });

      // Gamification: Award XP for roleplay session
      try {
        const perfScore = feedback.overallScore || 50;
        const xpAmount = perfScore >= 80 ? XP_CONFIG.ROLEPLAY_HIGH_SCORE : XP_CONFIG.ROLEPLAY_SESSION_COMPLETE;
        await awardXP(userId, xpAmount, 'roleplay_session', String(sessionId), `Roleplay session (score: ${perfScore})`);
        
        const allSessions = await storage.getRoleplaySessionsByAgent(userId);
        const completedSessions = allSessions.filter(s => s.status === 'completed').length;
        await checkBadgeProgression(userId, 'roleplay', completedSessions);
      } catch (gamErr) {
        console.error("[Gamification] Error awarding roleplay XP:", gamErr);
      }

      // Send email notification with session summary
      const agentName = req.user.claims.name || req.user.claims.username || "Agent";
      const agentEmail = req.user.claims.email || "";
      
      // Create a summary of the conversation (first 500 chars)
      const conversationSummary = conversationText.length > 500 
        ? conversationText.substring(0, 500) + "..."
        : conversationText;

      sendRoleplaySessionEmail({
        agentName,
        agentEmail,
        scenario: session.scenario,
        mode: session.mode,
        performanceScore: feedback.overallScore || 50,
        feedback,
        conversationSummary,
        sessionId,
        completedAt: endedAt,
      }).catch(err => console.error("Failed to send roleplay session email:", err));

      res.json({
        status: "completed",
        feedback,
      });
    } catch (error) {
      console.error("Error ending roleplay session:", error);
      res.status(500).json({ error: "Failed to end session" });
    }
  });

  app.get("/api/roleplay/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessions = await storage.getRoleplaySessionsByAgent(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching roleplay sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.delete("/api/roleplay/sessions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const session = await storage.getRoleplaySession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      if (session.agentId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const deleted = await storage.deleteRoleplaySession(sessionId);
      res.json({ success: deleted });
    } catch (error) {
      console.error("Error deleting roleplay session:", error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  app.delete("/api/roleplay/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deletedCount = await storage.deleteAllRoleplaySessions(userId);
      res.json({ success: true, deletedCount });
    } catch (error) {
      console.error("Error deleting roleplay sessions:", error);
      res.status(500).json({ error: "Failed to delete sessions" });
    }
  });

  // ======================
  // Daily Edge API Routes
  // ======================
  
  // Get today's Daily Edge content for the logged-in user
  app.get("/api/daily-edge/today", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const todaysContent = await storage.getTodaysDailyEdge(userId);
      // Transform to match UI expectations
      res.json({
        todaysBelief: todaysContent.belief,
        content: todaysContent.content,
      });
    } catch (error) {
      console.error("Error fetching today's Daily Edge:", error);
      res.status(500).json({ error: "Failed to fetch today's content" });
    }
  });

  // Record viewing content
  app.post("/api/daily-edge/view", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { contentId, reflection } = req.body;
      
      if (!contentId || typeof contentId !== "number") {
        return res.status(400).json({ error: "contentId is required and must be a number" });
      }
      
      const view = await storage.recordDailyEdgeView(userId, contentId, reflection);

      // Gamification: Award XP for daily edge view
      try {
        await awardXP(userId, XP_CONFIG.DAILY_EDGE_VIEW, 'daily_edge_view', String(contentId), 'Daily Edge content viewed');
      } catch (gamErr) {
        console.error("[Gamification] Error awarding Daily Edge view XP:", gamErr);
      }

      res.status(201).json(view);
    } catch (error: any) {
      console.error("Error recording Daily Edge view:", error);
      if (error.message === "Content not found") {
        return res.status(404).json({ error: "Content not found" });
      }
      res.status(500).json({ error: "Failed to record view" });
    }
  });

  // Mark challenge as completed
  app.post("/api/daily-edge/challenge-complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { contentId } = req.body;
      
      if (!contentId || typeof contentId !== "number") {
        return res.status(400).json({ error: "contentId is required and must be a number" });
      }
      
      const result = await storage.markChallengeCompleted(userId, contentId);
      if (!result) {
        return res.status(404).json({ error: "Content not found" });
      }

      // Gamification: Award XP for challenge completion
      try {
        await awardXP(userId, XP_CONFIG.DAILY_EDGE_CHALLENGE, 'daily_edge_challenge', String(contentId), 'Daily Edge challenge completed');
        
        const progress = await storage.getUserDailyEdgeProgress(userId);
        await checkBadgeProgression(userId, 'daily_edge', progress.challengesCompleted || 0);
      } catch (gamErr) {
        console.error("[Gamification] Error awarding Daily Edge challenge XP:", gamErr);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error completing Daily Edge challenge:", error);
      res.status(500).json({ error: "Failed to mark challenge as completed" });
    }
  });

  // Get user's Daily Edge progress and streaks
  app.get("/api/daily-edge/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getUserDailyEdgeProgress(userId);
      const beliefProgress = await storage.getUserBeliefProgress(userId);
      
      // Get total content per belief for progress calculation
      const allContent = await storage.getDailyEdgeContent();
      const contentByBelief: Record<string, number> = {};
      for (const item of allContent) {
        contentByBelief[item.belief] = (contentByBelief[item.belief] || 0) + 1;
      }
      
      // Transform beliefProgress to match UI expectations
      // Include all 5 beliefs even if user hasn't viewed any content yet
      const beliefs = DAILY_EDGE_BELIEFS.map(belief => {
        const userProgress = beliefProgress.find(p => p.belief === belief);
        return {
          belief,
          totalContent: contentByBelief[belief] || 0,
          viewedContent: userProgress?.contentViewed || 0,
          completedChallenges: userProgress?.challengesCompleted || 0,
        };
      });
      
      res.json({
        totalViewed: progress.totalViewed,
        challengesCompleted: progress.challengesCompleted,
        streak: {
          current: progress.streak?.currentStreak || 0,
          longest: progress.streak?.longestStreak || 0,
        },
        beliefs,
      });
    } catch (error) {
      console.error("Error fetching Daily Edge progress:", error);
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  // Get all content for a specific belief
  app.get("/api/daily-edge/belief/:belief", isAuthenticated, async (req: any, res) => {
    try {
      const { belief } = req.params;
      
      if (!DAILY_EDGE_BELIEFS.includes(belief as any)) {
        return res.status(400).json({ 
          error: `Invalid belief. Must be one of: ${DAILY_EDGE_BELIEFS.join(", ")}` 
        });
      }
      
      const content = await storage.getDailyEdgeContent(belief);
      res.json(content);
    } catch (error) {
      console.error("Error fetching belief content:", error);
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

  // Admin only: Seed Daily Edge content
  app.post("/api/daily-edge/seed", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const { content } = req.body;
      
      if (!Array.isArray(content) || content.length === 0) {
        return res.status(400).json({ error: "content must be a non-empty array" });
      }
      
      // Validate each content item
      const validatedContent = [];
      for (const item of content) {
        const parsed = insertDailyEdgeContentSchema.safeParse(item);
        if (!parsed.success) {
          return res.status(400).json({ 
            error: "Invalid content item",
            details: parsed.error.errors 
          });
        }
        validatedContent.push(parsed.data);
      }
      
      const created = await storage.seedDailyEdgeContent(validatedContent);
      res.status(201).json({ 
        success: true, 
        count: created.length,
        items: created 
      });
    } catch (error) {
      console.error("Error seeding Daily Edge content:", error);
      res.status(500).json({ error: "Failed to seed content" });
    }
  });

  // Daily Edge AI Chat - Interactive discussion about today's content
  app.post("/api/daily-edge/chat", isAuthenticated, async (req: any, res) => {
    try {
      console.log("[Daily Edge Chat] Received request");
      const { messages, todaysBelief, todaysContent } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }
      
      if (!todaysBelief) {
        return res.status(400).json({ error: "Today's belief is required" });
      }
      
      const client = getAIIntegrationsClient();
      console.log("[Daily Edge Chat] Got AI client");
      
      // Build comprehensive knowledge context
      const beliefDescriptions: Record<string, string> = {
        fulfilment: "finding meaning and purpose in sales work, making a genuine difference in customers' lives, and achieving personal satisfaction from helping others succeed",
        control: "taking responsibility for your outcomes, being proactive rather than reactive, owning your mindset and actions regardless of external circumstances",
        resilience: "bouncing back from rejection, maintaining mental toughness and persistence, learning from setbacks and using them as fuel for growth",
        influence: "understanding buyer psychology, building authentic rapport, ethical persuasion techniques, and the art of helping people make decisions that serve them",
        communication: "active listening, powerful storytelling, asking transformative questions, and connecting authentically with prospects and clients"
      };
      
      // Skip Drive context for now to avoid blocking - can be added in background later
      const trainingContext = "";
      
      const systemPrompt = `You are a world-class sales mindset coach, deeply versed in "The Salesperson's Secret Code" and the 5 Destination Beliefs that distinguish top sales performers. You help sales professionals develop the mental frameworks and beliefs that drive success.

TODAY'S FOCUS: ${todaysBelief.toUpperCase()}
${beliefDescriptions[todaysBelief] ? `This belief is about ${beliefDescriptions[todaysBelief]}.` : ""}

${todaysContent?.quote ? `TODAY'S INSPIRING QUOTE: "${todaysContent.quote.content}"${todaysContent.quote.source ? ` — ${todaysContent.quote.source}` : ""}` : ""}

${todaysContent?.insight ? `TODAY'S RESEARCH INSIGHT: ${todaysContent.insight.content}` : ""}

${todaysContent?.challenge ? `TODAY'S CHALLENGE: ${todaysContent.challenge.content}` : ""}

THE 5 DESTINATION BELIEFS (from "The Salesperson's Secret Code"):
1. FULFILMENT - Top performers find deep meaning in their work. They see sales as a noble profession of helping others.
2. CONTROL - Winners take responsibility for outcomes. They control what they can and adapt to what they can't.
3. RESILIENCE - The best bounce back fast. Rejection is fuel, not failure. They maintain unshakeable mental toughness.
4. INFLUENCE - Masters understand psychology. They build trust naturally and help prospects see new possibilities.
5. COMMUNICATION - Elite sellers listen more than they talk. They tell compelling stories and ask transformative questions.

KEY PRINCIPLES TO REFERENCE:
- Beliefs shape behaviors, behaviors shape results
- Success comes from mastering your inner game first
- The difference between good and great is mindset, not technique
- Top performers have learned to control their emotional state
- Resilience is a skill that can be developed through practice
- Your self-talk determines your sales outcomes
${trainingContext}

YOUR APPROACH:
1. Be warm, encouraging, and conversational - like a trusted mentor
2. Connect the day's content to practical sales situations they might face
3. Share relevant stories, examples, and research from sales psychology
4. Ask thought-provoking questions that help them internalize the lessons
5. Offer specific, actionable ideas they can apply immediately
6. Keep responses focused and impactful (2-4 paragraphs typically)
7. Reference the 5 Beliefs naturally when relevant
8. Use their name if they share it, build personal connection

Remember: You're not just sharing information - you're helping them BELIEVE differently so they can PERFORM differently.`;
      
      const chatMessages: Array<{role: "system" | "user" | "assistant", content: string}> = [
        { role: "system", content: systemPrompt }
      ];
      
      // Add recent conversation messages (last 20)
      const recentMessages = messages.slice(-20);
      recentMessages.forEach((m: {role: string, content: string}) => {
        chatMessages.push({ 
          role: m.role as "user" | "assistant", 
          content: m.content 
        });
      });
      
      console.log("[Daily Edge Chat] Calling AI with", chatMessages.length, "messages");
      
      // Add timeout protection (25 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("AI response timeout")), 25000);
      });
      
      const aiPromise = client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: chatMessages,
        max_completion_tokens: 1000,
        temperature: 0.85,
      });
      
      const response = await Promise.race([aiPromise, timeoutPromise]);
      
      console.log("[Daily Edge Chat] Got AI response");
      
      const aiResponse = response.choices[0]?.message?.content?.trim() || 
        "That's a great question. Let me think about how to best connect this to your sales journey. Could you share a bit more about what's on your mind?";
      
      console.log("[Daily Edge Chat] Sending response:", aiResponse.slice(0, 50) + "...");
      res.json({ response: aiResponse });
    } catch (error: any) {
      console.error("[Daily Edge Chat] Error:", error?.message || error);
      if (error?.message === "AI response timeout") {
        res.status(504).json({ error: "Response took too long. Please try again." });
      } else {
        res.status(500).json({ error: "Failed to generate response. Please try again." });
      }
    }
  });

  // ============================================
  // EquipIQ - Equipment Recommendation System
  // ============================================

  // EquipIQ request validation schemas
  const equipIQRecommendSchema = z.object({
    message: z.string().min(1, "Message is required"),
    conversationHistory: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })).optional().default([]),
  });

  const equipIQQuizResultSchema = z.object({
    vendorId: z.string().nullable().optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    totalQuestions: z.number().int().positive(),
    correctAnswers: z.number().int().min(0),
    score: z.number().min(0).max(100),
  });

  const equipIQQuizGenerateSchema = z.object({
    vendorId: z.string().nullable().optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional().default("beginner"),
    questionCount: z.number().int().min(1).max(20).optional().default(5),
  });

  // Initialize EquipIQ data on startup
  seedEquipIQData().then(result => {
    console.log(`[EquipIQ] Seeded ${result.vendors} vendors, ${result.products} products, ${result.businessTypes} business types`);
  }).catch(err => {
    console.error("[EquipIQ] Error seeding data:", err);
  });

  // Initialize Role-play Personas on startup
  seedRoleplayPersonas().catch(err => {
    console.error("[RoleplayPersonas] Error seeding personas:", err);
  });

  // Get all vendors
  app.get("/api/equipiq/vendors", isAuthenticated, async (req, res) => {
    try {
      const vendors = await storage.getEquipmentVendors();
      res.json(vendors);
    } catch (error) {
      console.error("[EquipIQ] Error fetching vendors:", error);
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  // Get vendor by ID
  app.get("/api/equipiq/vendors/:vendorId", isAuthenticated, async (req, res) => {
    try {
      const vendor = await storage.getEquipmentVendorById(req.params.vendorId);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("[EquipIQ] Error fetching vendor:", error);
      res.status(500).json({ error: "Failed to fetch vendor" });
    }
  });

  // Get all products (optionally by vendor)
  app.get("/api/equipiq/products", isAuthenticated, async (req, res) => {
    try {
      const vendorId = req.query.vendor as string | undefined;
      const products = await storage.getEquipmentProducts(vendorId);
      res.json(products);
    } catch (error) {
      console.error("[EquipIQ] Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Search products
  app.get("/api/equipiq/products/search", isAuthenticated, async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json([]);
      }
      const products = await storage.searchEquipmentProducts(query);
      res.json(products);
    } catch (error) {
      console.error("[EquipIQ] Error searching products:", error);
      res.status(500).json({ error: "Failed to search products" });
    }
  });

  // Get product by ID
  app.get("/api/equipiq/products/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getEquipmentProductById(id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("[EquipIQ] Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Get business types
  app.get("/api/equipiq/business-types", isAuthenticated, async (req, res) => {
    try {
      const types = await storage.getEquipmentBusinessTypes();
      res.json(types);
    } catch (error) {
      console.error("[EquipIQ] Error fetching business types:", error);
      res.status(500).json({ error: "Failed to fetch business types" });
    }
  });

  // AI-powered equipment recommendation chat
  app.post("/api/equipiq/recommend", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || "anonymous";
      const parseResult = equipIQRecommendSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid request" });
      }
      const { message, conversationHistory } = parseResult.data;

      // Get all products and vendors for context
      const [products, vendors] = await Promise.all([
        storage.getEquipmentProducts(),
        storage.getEquipmentVendors()
      ]);

      // Build product catalog context
      const productContext = vendors.map(vendor => {
        const vendorProducts = products.filter(p => p.vendorId === vendor.vendorId);
        return `
## ${vendor.name}
${vendor.description}
Target Market: ${vendor.targetMarket}
Key Differentiators: ${vendor.keyDifferentiators?.join(", ") || "N/A"}

Products:
${vendorProducts.map(p => `- ${p.name} (${p.type}): ${p.description} ${p.bestFor ? `Best for: ${p.bestFor.join(", ")}` : ""}`).join("\n")}
`;
      }).join("\n\n");

      const systemPrompt = `You are EquipIQ, an expert AI assistant helping PCBancard sales agents recommend the right payment equipment to merchants. You have deep knowledge of 6 payment solution vendors and their products.

YOUR KNOWLEDGE BASE:
${productContext}

VENDOR QUICK REFERENCE:
- SwipeSimple: Best for mobile/simple needs, Tap to Pay on iPhone, easy setup
- Dejavoo: Widest terminal selection (P, QD, Z lines), Android & Linux, gateway integration
- MX POS: FREE hardware program, 600+ features, great for restaurants/retail/salons
- Hot Sauce POS: Bars & nightclubs specialist, 24/7 LIVE support, on-premise reliability
- Valor PayTech: ISO/ISV focused, dual pricing/surcharge, chargeback protection
- FluidPay: Gateway only, non-compete guarantee, processor agnostic, white-label

YOUR ROLE:
1. Ask clarifying questions about the merchant's business (type, volume, mobility needs, integration requirements)
2. Recommend 1-3 specific products based on their needs
3. Explain WHY each product fits their use case
4. Highlight key features and differentiators
5. Mention pricing considerations if relevant

GUIDELINES:
- Be conversational and helpful, like an experienced colleague
- Give specific product recommendations with model names
- Explain trade-offs between options
- Consider the merchant's technical sophistication
- Focus on solving their business problems
- Keep responses concise but complete (3-5 paragraphs max)

If you don't have enough info, ask ONE clarifying question. Common questions:
- What type of business? (restaurant, retail, mobile service, etc.)
- Average monthly processing volume?
- Need mobility (tableside, delivery, events)?
- Any specific integrations needed (QuickBooks, inventory, online ordering)?
- Is cost or features more important?`;

      const chatMessages: Array<{role: "system" | "user" | "assistant", content: string}> = [
        { role: "system", content: systemPrompt }
      ];

      // Add conversation history (last 20 messages)
      const recentMessages = conversationHistory.slice(-20);
      recentMessages.forEach((m: {role: string, content: string}) => {
        chatMessages.push({ 
          role: m.role as "user" | "assistant", 
          content: m.content 
        });
      });

      // Add the new user message
      chatMessages.push({ role: "user", content: message });

      console.log("[EquipIQ] Calling AI with", chatMessages.length, "messages");

      const client = getAIIntegrationsClient();
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("AI response timeout")), 30000);
      });

      const aiPromise = client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: chatMessages,
        max_completion_tokens: 1200,
        temperature: 0.7,
      });

      const response = await Promise.race([aiPromise, timeoutPromise]);
      const aiResponse = response.choices[0]?.message?.content?.trim() || 
        "I'd be happy to help you find the right payment solution. Could you tell me more about the type of business and their needs?";

      console.log("[EquipIQ] Got response:", aiResponse.slice(0, 80) + "...");

      // Save the recommendation session
      await storage.createEquipmentRecommendationSession({
        userId: userId,
        aiResponse: aiResponse,
      });

      res.json({ response: aiResponse });
    } catch (error: any) {
      console.error("[EquipIQ] Error:", error?.message || error);
      if (error?.message === "AI response timeout") {
        res.status(504).json({ error: "Response took too long. Please try again." });
      } else {
        res.status(500).json({ error: "Failed to generate recommendation. Please try again." });
      }
    }
  });

  // Get user's recommendation history
  app.get("/api/equipiq/recommendations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || "anonymous";
      const sessions = await storage.getEquipmentRecommendationSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("[EquipIQ] Error fetching recommendations:", error);
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  // Get user's quiz results
  app.get("/api/equipiq/quiz-results", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || "anonymous";
      const results = await storage.getEquipmentQuizResults(userId);
      res.json(results);
    } catch (error) {
      console.error("[EquipIQ] Error fetching quiz results:", error);
      res.status(500).json({ error: "Failed to fetch quiz results" });
    }
  });

  // Submit quiz result
  app.post("/api/equipiq/quiz-results", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || "anonymous";
      const parseResult = equipIQQuizResultSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid request" });
      }
      const { vendorId, difficulty, totalQuestions, correctAnswers, score } = parseResult.data;

      const result = await storage.createEquipmentQuizResult({
        userId: userId,
        vendorId,
        difficulty,
        totalQuestions,
        correctAnswers,
        score,
      });

      // Gamification: Award XP for quiz completion
      try {
        const isPerfect = correctAnswers === totalQuestions;
        const xpAmount = isPerfect ? XP_CONFIG.EQUIPIQ_QUIZ_PERFECT : XP_CONFIG.EQUIPIQ_QUIZ_COMPLETE;
        await awardXP(userId, xpAmount, 'equipiq_quiz', String(result.id), `EquipIQ quiz: ${isPerfect ? 'Perfect score' : `${correctAnswers}/${totalQuestions}`}`);
        
        const allResults = await storage.getEquipmentQuizResults(userId);
        await checkBadgeProgression(userId, 'equipiq', allResults.length);
      } catch (gamErr) {
        console.error("[Gamification] Error awarding EquipIQ XP:", gamErr);
      }

      res.json(result);
    } catch (error) {
      console.error("[EquipIQ] Error saving quiz result:", error);
      res.status(500).json({ error: "Failed to save quiz result" });
    }
  });

  // Generate quiz questions for a vendor
  app.post("/api/equipiq/quiz/generate", isAuthenticated, async (req, res) => {
    try {
      const parseResult = equipIQQuizGenerateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid request" });
      }
      const { vendorId, difficulty, questionCount } = parseResult.data;

      // Get vendor and products
      const vendor = vendorId ? await storage.getEquipmentVendorById(vendorId) : null;
      const products = vendorId 
        ? await storage.getEquipmentProducts(vendorId)
        : await storage.getEquipmentProducts();
      const vendors = await storage.getEquipmentVendors();

      const contextInfo = vendor 
        ? `Focus on ${vendor.name}: ${vendor.description}\nProducts: ${products.map(p => `${p.name}: ${p.description}`).join("\n")}`
        : `All vendors: ${vendors.map(v => `${v.name}: ${v.description}`).join("\n")}\nProducts: ${products.slice(0, 30).map(p => `${p.vendorId} - ${p.name}: ${p.description}`).join("\n")}`;

      const difficultyContext = {
        beginner: "Ask basic questions about product names, categories, and simple features. Suitable for new agents.",
        intermediate: "Ask about product comparisons, best-use scenarios, and key differentiators. Suitable for agents with some experience.",
        advanced: "Ask complex questions about integration capabilities, pricing strategies, and nuanced product selection. Suitable for experienced agents."
      };

      const systemPrompt = `You are generating quiz questions to train sales agents on payment equipment knowledge.

CONTEXT:
${contextInfo}

DIFFICULTY LEVEL: ${difficulty}
${difficultyContext[difficulty as keyof typeof difficultyContext]}

Generate exactly ${questionCount} multiple choice questions. Each question should have 4 options with exactly one correct answer.

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}`;

      const client = getAIIntegrationsClient();
      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "system", content: systemPrompt }],
        max_completion_tokens: 2000,
        temperature: 0.8,
      });

      const content = response.choices[0]?.message?.content?.trim() || "";
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Invalid response format");
      }

      const quizData = JSON.parse(jsonMatch[0]);
      res.json(quizData);
    } catch (error: any) {
      console.error("[EquipIQ] Error generating quiz:", error);
      res.status(500).json({ error: "Failed to generate quiz questions" });
    }
  });

  // ============================================
  // Presentation Training API
  // ============================================

  // Get all modules with lessons and user progress
  app.get("/api/presentation/modules", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const modulesWithLessons = await storage.getPresentationModulesWithLessons();
      const userProgress = await storage.getUserPresentationProgress(userId);
      
      const progressMap = new Map(userProgress.map(p => [p.lessonId, p]));
      
      const result = modulesWithLessons.map(module => ({
        ...module,
        lessons: module.lessons.map((lesson: any) => ({
          ...lesson,
          progress: progressMap.get(lesson.id) || null,
        })),
      }));
      
      res.json(result);
    } catch (error) {
      console.error("[Presentation] Error fetching modules:", error);
      res.status(500).json({ error: "Failed to fetch presentation modules" });
    }
  });

  // Get a specific lesson with full content, quizzes, and progress
  app.get("/api/presentation/lessons/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const lessonId = parseInt(req.params.id, 10);
      
      if (isNaN(lessonId)) {
        return res.status(400).json({ error: "Invalid lesson ID" });
      }
      
      const lesson = await storage.getPresentationLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }
      
      const [quizzes, progress] = await Promise.all([
        storage.getPresentationLessonQuizzes(lessonId),
        storage.getUserLessonProgress(userId, lessonId),
      ]);
      
      res.json({
        ...lesson,
        quizzes,
        progress: progress || null,
      });
    } catch (error) {
      console.error("[Presentation] Error fetching lesson:", error);
      res.status(500).json({ error: "Failed to fetch lesson" });
    }
  });

  // Update lesson progress
  app.post("/api/presentation/progress/:lessonId", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const lessonId = parseInt(req.params.lessonId, 10);
      
      if (isNaN(lessonId)) {
        return res.status(400).json({ error: "Invalid lesson ID" });
      }
      
      const lesson = await storage.getPresentationLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }
      
      const { completed, practiceRecorded, quizPassed } = req.body;
      
      const progressData = {
        userId,
        lessonId,
        completed: completed ?? false,
        practiceRecorded: practiceRecorded ?? false,
        quizPassed: quizPassed ?? false,
      };
      
      const progress = await storage.upsertPresentationProgress(progressData);

      // Gamification: Award XP for lesson completion
      try {
        if (completed) {
          const xpResult = await awardXP(userId, XP_CONFIG.PRESENTATION_LESSON_COMPLETE, 'presentation_lesson', String(lessonId), `Completed presentation lesson`);
          
          if (quizPassed) {
            await awardXP(userId, XP_CONFIG.PRESENTATION_QUIZ_PASS, 'presentation_quiz', String(lessonId), `Passed presentation quiz`);
          }
          
          const allProgress = await storage.getUserPresentationProgress(userId);
          const completedLessons = allProgress.filter((p: any) => p.completed).length;
          await checkBadgeProgression(userId, 'presentation', completedLessons);
        }
      } catch (gamErr) {
        console.error("[Gamification] Error awarding presentation XP:", gamErr);
      }

      res.json(progress);
    } catch (error) {
      console.error("[Presentation] Error updating progress:", error);
      res.status(500).json({ error: "Failed to update progress" });
    }
  });

  // AI teaching endpoint for asking questions
  app.post("/api/presentation/ask", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const { question, lessonContext } = req.body;
      
      if (!question || typeof question !== "string") {
        return res.status(400).json({ error: "Question is required" });
      }
      
      const systemPrompt = `You are an expert sales training coach for PCBancard's Dual Pricing presentation. Your role is to help sales agents understand and master the presentation.

## Your Knowledge Base

### Master Sales Script Overview
${PCBANCARD_SALES_SCRIPT}

### Key Persuasion Principles
The PCBancard presentation uses proven psychological principles:

1. **Problem Awareness**: Merchants often don't realize they're losing 3-4% on every card transaction
2. **Anchoring**: Use specific numbers like "$17,412" instead of "about $17,000" for psychological impact
3. **Social Proof**: Reference other merchants who have successfully switched (like Marcus the tire shop owner)
4. **Loss Aversion**: Frame the conversation around money being "taken" rather than "saved"
5. **Identity Activation**: Connect the solution to the merchant's identity as a business owner
6. **Three Options Framework**: Present Interchange-Plus, Surcharging, and Dual Pricing as choices
7. **Risk Reversal**: The 90-Day Protection Promise removes fear of commitment
8. **Community Building**: Position the merchant as joining a movement of smart business owners

### Presentation Structure (8 Videos)
1. Hello - Initial connection and problem introduction
2. Problem Statement - Quantify the fee losses
3. Story Proof - Real merchant success stories
4. Solution Options - Present the three pricing options
5. Dual Pricing Details - Deep dive into Dual Pricing program
6. Process & Protection - How switching works, 90-day promise
7. Fit Check - Ensure solution fits their business
8. Close & Community - Action steps and referral opportunity

${lessonContext ? `\n### Current Lesson Context\n${lessonContext}\n` : ""}

## Your Teaching Approach
- Explain WHY each element of the presentation works, not just WHAT to say
- Connect script elements to psychological principles
- Provide practical examples and role-play scenarios
- Help agents anticipate and handle objections
- Encourage agents to practice and internalize the material
- Be supportive but direct - this is sales training, not hand-holding

## Response Guidelines
- Keep answers focused and actionable
- Use examples from the presentation when relevant
- If asked about objections, provide specific language to use
- If asked about psychology, explain the mechanism clearly
- Encourage practice and repetition for mastery`;

      const client = getAIIntegrationsClient();
      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        max_completion_tokens: 1000,
        temperature: 0.7,
      });

      const answer = response.choices[0]?.message?.content?.trim() || "I'm sorry, I couldn't generate a response. Please try again.";
      res.json({ answer });
    } catch (error: any) {
      console.error("[Presentation] Error in AI ask:", error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });

  const practiceFeedbackSchema = z.object({
    lessonId: z.number().optional(),
    practicePrompt: z.string().min(1, "Practice prompt is required"),
    userResponse: z.string().min(1, "User response is required"),
    lessonTitle: z.string().optional(),
    scriptText: z.string().optional(),
  });

  app.post("/api/presentation/practice-feedback", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const parsed = practiceFeedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.format() });
      }
      
      const { practicePrompt, userResponse, lessonTitle, scriptText } = parsed.data;
      
      const systemPrompt = `You are an expert sales training coach for PCBancard's Dual Pricing presentation. Your role is to evaluate practice responses from sales agents and provide constructive, actionable feedback.

## Lesson Context
${lessonTitle ? `Lesson: "${lessonTitle}"` : ""}
${scriptText ? `Script Reference: ${scriptText}` : ""}

## Evaluation Criteria
1. **Key Concepts**: Did they capture the main points of the lesson?
2. **Understanding**: Do they show genuine comprehension, not just memorization?
3. **Application**: Can they apply this to real sales situations?
4. **Language**: Are they using effective persuasive language?
5. **Confidence**: Does their response convey confidence and authority?

## Feedback Guidelines
- Start with what they did well (be specific)
- Identify 1-2 areas for improvement
- Provide a concrete example or suggestion
- End with encouragement
- Keep feedback concise (3-4 paragraphs max)
- Be supportive but direct - this is sales training`;

      const client = getAIIntegrationsClient();
      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Practice Prompt: "${practicePrompt}"\n\nAgent's Response: "${userResponse}"\n\nPlease evaluate this response and provide constructive feedback.`
          },
        ],
        max_completion_tokens: 800,
        temperature: 0.7,
      });

      const feedback = response.choices[0]?.message?.content?.trim() || "Unable to generate feedback. Please try again.";
      
      res.json({ feedback });
    } catch (error: any) {
      console.error("[Presentation] Error in practice feedback:", error);
      res.status(500).json({ error: "Failed to get AI feedback" });
    }
  });

  // Save practice response with AI feedback
  const savePracticeResponseSchema = z.object({
    lessonId: z.number(),
    practiceResponse: z.string().min(1),
    aiFeedback: z.string().optional(),
    feedbackScore: z.number().min(0).max(100).optional(),
    strengths: z.array(z.string()).optional(),
    improvements: z.array(z.string()).optional(),
  });

  app.post("/api/presentation/practice-responses", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      console.log("[Presentation] Saving practice response, body:", JSON.stringify(req.body));
      
      const parsed = savePracticeResponseSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error("[Presentation] Validation failed:", parsed.error.format());
        return res.status(400).json({ error: "Invalid request", details: parsed.error.format() });
      }
      
      const userId = req.user?.claims?.sub;
      if (!userId) {
        console.error("[Presentation] No user ID found in request");
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const { lessonId, practiceResponse, aiFeedback, feedbackScore, strengths, improvements } = parsed.data;
      
      console.log("[Presentation] Inserting practice response for lesson:", lessonId, "user:", userId);
      
      const [saved] = await db
        .insert(presentationPracticeResponses)
        .values({
          lessonId,
          userId,
          practiceResponse,
          aiFeedback,
          feedbackScore,
          strengths,
          improvements,
        })
        .returning();
      
      console.log("[Presentation] Practice response saved, ID:", saved?.id);
      
      // Also mark practice as recorded in progress
      await db
        .insert(presentationProgress)
        .values({
          lessonId,
          userId,
          practiceRecorded: true,
        })
        .onConflictDoUpdate({
          target: [presentationProgress.lessonId, presentationProgress.userId],
          set: { practiceRecorded: true },
        });
      
      console.log("[Presentation] Progress updated for lesson:", lessonId);
      
      res.json({ success: true, response: saved });
    } catch (error: any) {
      console.error("[Presentation] Error saving practice response:", error.message, error.stack);
      res.status(500).json({ error: "Failed to save practice response", details: error.message });
    }
  });

  // Get practice responses for a lesson
  app.get("/api/presentation/practice-responses/:lessonId", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      const userId = req.user.claims.sub;
      
      if (isNaN(lessonId)) {
        return res.status(400).json({ error: "Invalid lesson ID" });
      }
      
      const responses = await db
        .select()
        .from(presentationPracticeResponses)
        .where(
          and(
            eq(presentationPracticeResponses.lessonId, lessonId),
            eq(presentationPracticeResponses.userId, userId)
          )
        )
        .orderBy(desc(presentationPracticeResponses.createdAt));
      
      res.json({ responses });
    } catch (error: any) {
      console.error("[Presentation] Error fetching practice responses:", error);
      res.status(500).json({ error: "Failed to fetch practice responses" });
    }
  });

  // Get all practice responses for the user (for history/review)
  app.get("/api/presentation/practice-responses", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const responses = await db
        .select({
          id: presentationPracticeResponses.id,
          lessonId: presentationPracticeResponses.lessonId,
          practiceResponse: presentationPracticeResponses.practiceResponse,
          aiFeedback: presentationPracticeResponses.aiFeedback,
          feedbackScore: presentationPracticeResponses.feedbackScore,
          strengths: presentationPracticeResponses.strengths,
          improvements: presentationPracticeResponses.improvements,
          createdAt: presentationPracticeResponses.createdAt,
          lessonTitle: presentationLessons.title,
        })
        .from(presentationPracticeResponses)
        .leftJoin(presentationLessons, eq(presentationPracticeResponses.lessonId, presentationLessons.id))
        .where(eq(presentationPracticeResponses.userId, userId))
        .orderBy(desc(presentationPracticeResponses.createdAt))
        .limit(50);
      
      res.json({ responses });
    } catch (error: any) {
      console.error("[Presentation] Error fetching all practice responses:", error);
      res.status(500).json({ error: "Failed to fetch practice responses" });
    }
  });

  // ============================================
  // Proposal Generator Routes
  // ============================================

  const pdfUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === "application/pdf") {
        cb(null, true);
      } else {
        cb(new Error("Only PDF files are allowed"));
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  });

  app.post("/api/proposals/research", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const { websiteUrl, businessName, industryGuess } = req.body;

      if (!websiteUrl || typeof websiteUrl !== "string") {
        return res.status(400).json({ error: "websiteUrl is required" });
      }

      const research = await researchBusiness(websiteUrl, businessName, industryGuess);

      res.json(research);
    } catch (error: any) {
      console.error("[Proposals] Error researching business:", error);
      res.status(500).json({
        researchStatus: "failed",
        error: error.message || "Unknown error occurred",
      });
    }
  });

  app.post("/api/proposals/parse", isAuthenticated, ensureOrgMembership(), pdfUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "File is required" });
      }

      console.log(`[Proposals] Parsing file: ${req.file.originalname}, size: ${req.file.buffer?.length || 0} bytes, mimetype: ${req.file.mimetype}`);
      
      const { parseProposalFile } = await import("./proposal-generator");
      const parsedData = await parseProposalFile(req.file.buffer, req.file.originalname);

      res.json({
        success: true,
        data: parsedData,
      });
    } catch (error: any) {
      console.error("[Proposals] Error parsing file:", error);
      res.status(500).json({ error: "Failed to parse file: " + (error.message || "Unknown error") });
    }
  });

  // Parse proposal files from Object Storage (same approach as Statement Analyzer)
  const parseFromStorageSchema = z.object({
    files: z.array(z.object({
      path: z.string().min(1, "File path is required"),
      mimeType: z.string().min(1, "MIME type is required"),
      name: z.string().min(1, "File name is required")
    })).min(1, "At least one file is required")
  });
  
  app.post("/api/proposals/parse-from-storage", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const parsed = parseFromStorageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          error: "Invalid request body",
          details: parsed.error.format() 
        });
      }
      
      const { files } = parsed.data;
      console.log(`[Proposals] Parsing ${files.length} file(s) from storage`);
      
      // Import the parsing function that works with Object Storage
      const { parseProposalFromStorage } = await import("./proposal-generator");
      const parsedData = await parseProposalFromStorage(files);
      
      res.json({
        success: true,
        data: parsedData,
      });
    } catch (error: any) {
      console.error("[Proposals] Error parsing files from storage:", error);
      res.status(500).json({ error: "Failed to parse files: " + (error.message || "Unknown error") });
    }
  });

  // ============================================================================
  // PROPOSAL PARSE BACKGROUND JOBS API (must be before /api/proposals/:id routes)
  // ============================================================================

  // POST /api/proposals/parse-jobs - Create a new background parse job
  app.post("/api/proposals/parse-jobs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { jobName, files } = req.body;

      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: "files array is required" });
      }

      const membership = await storage.getUserMembership(userId);
      const orgId = membership?.organization?.id || null;

      const filePaths = files.map((f: any) => f.path);
      const fileMimeTypes = files.map((f: any) => f.mimeType || "application/pdf");
      const fileNames = files.map((f: any) => f.name || "file.pdf");

      const job = await storage.createProposalParseJob({
        agentId: userId,
        organizationId: orgId,
        jobName: jobName || `Proposal Parse ${new Date().toLocaleDateString()}`,
        filePaths,
        fileMimeTypes,
        fileNames,
        status: "pending",
        progress: 0,
        progressMessage: "Queued for processing",
        retryCount: 0,
      });

      const baseUrl = `http://localhost:${process.env.PORT || 5000}`;
      fetch(`${baseUrl}/api/internal/process-proposal-parse-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": INTERNAL_SECRET,
        },
        body: JSON.stringify({ jobId: job.id }),
      }).catch(err => {
        console.error("[ProposalParse] Failed to trigger background processing:", err);
      });

      res.status(201).json({
        success: true,
        job: job,
        message: "Parsing started! We'll notify you when ready.",
      });
    } catch (error: any) {
      console.error("[ProposalParse] Create job error:", error);
      res.status(500).json({ error: "Failed to create parse job" });
    }
  });

  // GET /api/proposals/parse-jobs - List user's parse jobs
  app.get("/api/proposals/parse-jobs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const jobs = await storage.getProposalParseJobsByUser(userId);
      res.json({ jobs });
    } catch (error: any) {
      console.error("[ProposalParse] List jobs error:", error);
      res.status(500).json({ error: "Failed to fetch parse jobs" });
    }
  });

  // GET /api/proposals/parse-jobs/:id - Get a single job with results
  app.get("/api/proposals/parse-jobs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }

      const job = await storage.getProposalParseJob(id);

      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      if (job.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(job);
    } catch (error: any) {
      console.error("[ProposalParse] Get job error:", error);
      res.status(500).json({ error: "Failed to fetch parse job" });
    }
  });

  // POST /api/proposals/parse-jobs/:id/retry - Retry a failed job
  app.post("/api/proposals/parse-jobs/:id/retry", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }

      const job = await storage.getProposalParseJob(id);

      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      if (job.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.updateProposalParseJob(id, {
        status: "pending",
        errorMessage: null,
        retryCount: (job.retryCount || 0) + 1,
        progress: 0,
        progressMessage: "Queued for retry",
      });

      const baseUrl = `http://localhost:${process.env.PORT || 5000}`;
      fetch(`${baseUrl}/api/internal/process-proposal-parse-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": INTERNAL_SECRET,
        },
        body: JSON.stringify({ jobId: id }),
      }).catch(err => {
        console.error("[ProposalParse] Failed to trigger retry processing:", err);
      });

      res.json({
        success: true,
        jobId: id,
        status: "pending",
        message: "Retry started!",
      });
    } catch (error: any) {
      console.error("[ProposalParse] Retry job error:", error);
      res.status(500).json({ error: "Failed to retry parse job" });
    }
  });

  // DELETE /api/proposals/parse-jobs/:id - Delete a parse job
  app.delete("/api/proposals/parse-jobs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }

      const job = await storage.getProposalParseJob(id);

      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      if (job.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.deleteProposalParseJob(id);
      res.json({ success: true, message: "Job deleted" });
    } catch (error: any) {
      console.error("[ProposalParse] Delete job error:", error);
      res.status(500).json({ error: "Failed to delete parse job" });
    }
  });

  // Scrape merchant website for logo and business info
  app.post("/api/proposals/scrape-website", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const { websiteUrl } = req.body;
      
      if (!websiteUrl) {
        return res.status(400).json({ error: "Website URL is required" });
      }

      const scraped = await scrapeMerchantWebsite(websiteUrl);
      
      let logoBase64 = null;
      if (scraped.success && scraped.data.logoUrl) {
        logoBase64 = await fetchLogoAsBase64(scraped.data.logoUrl);
      }

      res.json({
        success: scraped.success,
        data: {
          ...scraped.data,
          logoBase64,
        },
      });
    } catch (error: any) {
      console.error("[Proposals] Error scraping website:", error);
      res.status(500).json({ error: "Failed to scrape website: " + (error.message || "Unknown error") });
    }
  });

  // Start agentic proposal build job
  app.post("/api/proposals/build", isAuthenticated, ensureOrgMembership(), pdfUpload.fields([
    { name: 'dualPricingFile', maxCount: 1 },
    { name: 'interchangePlusFile', maxCount: 1 },
  ]), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;
      
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const dualPricingFile = files?.dualPricingFile?.[0];
      const interchangePlusFile = files?.interchangePlusFile?.[0];
      
      const { 
        merchantWebsiteUrl, 
        salespersonName, 
        salespersonTitle, 
        salespersonEmail, 
        salespersonPhone,
        // Merchant info from form
        merchantBusinessName,
        merchantOwnerName,
        merchantAddress,
        merchantPhone,
        merchantEmail,
        merchantWebsite,
        merchantIndustry,
        repNotes,
        selectedEquipmentId,
        outputFormat = "pdf"
      } = req.body;

      console.log("[Proposals] Received form data:", {
        salespersonName,
        salespersonTitle,
        salespersonEmail,
        salespersonPhone,
        merchantBusinessName,
        merchantOwnerName,
        merchantWebsiteUrl,
        merchantWebsite,
        dualPricingFile: !!dualPricingFile,
        interchangePlusFile: !!interchangePlusFile,
      });

      if (!dualPricingFile && !interchangePlusFile) {
        return res.status(400).json({ error: "At least one cost analysis file is required" });
      }

      const merchantFormData = {
        businessName: merchantBusinessName || null,
        ownerName: merchantOwnerName || null,
        address: merchantAddress || null,
        phone: merchantPhone || null,
        email: merchantEmail || null,
        website: merchantWebsite || merchantWebsiteUrl || null,
        industry: merchantIndustry || null,
        repNotes: repNotes || null,
      };

      const jobId = await createProposalJob({
        userId,
        organizationId: membership.organization.id,
        merchantWebsiteUrl: merchantWebsiteUrl || merchantWebsite,
        salesperson: {
          name: salespersonName || "PCBancard Representative",
          title: salespersonTitle || "Account Executive",
          email: salespersonEmail || "",
          phone: salespersonPhone || "",
        },
        merchantFormData,
        selectedEquipmentId: selectedEquipmentId ? parseInt(selectedEquipmentId) : undefined,
        outputFormat: outputFormat as "pdf" | "docx",
      });

      // Execute job in background
      executeProposalJob(jobId, {
        userId,
        organizationId: membership.organization.id,
        merchantWebsiteUrl: merchantWebsiteUrl || merchantWebsite,
        salesperson: {
          name: salespersonName || "PCBancard Representative",
          title: salespersonTitle || "Account Executive",
          email: salespersonEmail || "",
          phone: salespersonPhone || "",
        },
        merchantFormData,
        selectedEquipmentId: selectedEquipmentId ? parseInt(selectedEquipmentId) : undefined,
        outputFormat: outputFormat as "pdf" | "docx",
        dualPricingBuffer: dualPricingFile?.buffer,
        interchangePlusBuffer: interchangePlusFile?.buffer,
        dualPricingFileName: dualPricingFile?.originalname,
        interchangePlusFileName: interchangePlusFile?.originalname,
      }).catch(error => {
        console.error("[Proposals] Background job failed:", error);
      });

      res.json({ 
        success: true, 
        jobId,
        message: "Proposal build started"
      });
    } catch (error: any) {
      console.error("[Proposals] Error starting build:", error);
      res.status(500).json({ error: "Failed to start proposal build: " + (error.message || "Unknown error") });
    }
  });

  // Get proposal job status
  app.get("/api/proposals/build/:jobId", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      
      if (isNaN(jobId)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }

      const job = await getProposalJobStatus(jobId);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Verify ownership
      if (job.userId !== req.user.claims.sub) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(job);
    } catch (error: any) {
      console.error("[Proposals] Error getting job status:", error);
      res.status(500).json({ error: "Failed to get job status: " + (error.message || "Unknown error") });
    }
  });

  // Download proposal job PDF
  app.get("/api/proposals/build/:jobId/download", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      
      if (isNaN(jobId)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }

      const job = await getProposalJobStatus(jobId);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Verify ownership
      if (job.userId !== req.user.claims.sub) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (job.status !== "completed") {
        return res.status(400).json({ error: "Proposal not yet completed" });
      }

      if (!job.pdfUrl) {
        return res.status(404).json({ error: "PDF not generated" });
      }

      // If it's a data URL, extract and send the PDF
      if (job.pdfUrl.startsWith("data:application/pdf;base64,")) {
        const base64Data = job.pdfUrl.replace("data:application/pdf;base64,", "");
        const pdfBuffer = Buffer.from(base64Data, "base64");
        
        const merchantName = (job.merchantScrapedData as any)?.businessName || "proposal";
        const filename = `${merchantName.replace(/[^a-zA-Z0-9]/g, "_")}_proposal.pdf`;
        
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.send(pdfBuffer);
      } else {
        // If it's a regular URL, redirect
        res.redirect(job.pdfUrl);
      }
    } catch (error: any) {
      console.error("[Proposals] Error downloading PDF:", error);
      res.status(500).json({ error: "Failed to download PDF: " + (error.message || "Unknown error") });
    }
  });

  app.post("/api/proposals/generate", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;

      const { parsedData, useAI, selectedTerminalId, selectedTerminalIds, selectedEquipmentDetails, renderer = "replit", format = "pdf", intakeData } = req.body;

      if (!parsedData || !parsedData.merchantName) {
        return res.status(400).json({ error: "Parsed proposal data is required" });
      }

      // Support both single ID (legacy) and array of IDs (new multi-select)
      const equipmentIds: number[] = selectedTerminalIds?.length > 0 
        ? selectedTerminalIds 
        : (selectedTerminalId ? [selectedTerminalId] : []);

      // Optionally call business research if website is provided
      let researchData: { businessDescription?: string; industryType?: string } | undefined;
      if (intakeData?.merchant?.businessWebsite) {
        try {
          researchData = await researchBusiness(intakeData.merchant.businessWebsite);
        } catch (researchError: any) {
          console.log("[Proposals] Business research failed, continuing without it:", researchError.message);
        }
      }

      // Generate industry-specific images for the proposal
      const industryType = intakeData?.merchant?.industryGuess || researchData?.industryType || "general business";
      let proposalImages: ProposalImages | undefined;
      try {
        proposalImages = await generateProposalImages(industryType, parsedData.merchantName);
        if (proposalImages.generationStatus !== "complete") {
          console.log("[Proposals] Image generation status:", proposalImages.generationStatus, proposalImages.errors);
        }
      } catch (imageError: any) {
        console.log("[Proposals] Image generation failed, continuing without images:", imageError.message);
        proposalImages = {
          generationStatus: "failed",
          errors: [imageError.message || "Unknown error"],
        };
      }

      const { generateProposalBlueprint, generateProposalPDF, generateProposalDOCX } = await import("./proposal-generator");

      // Handle multiple equipment selections (or legacy single selection)
      let equipment: { name: string; features: string[]; whySelected: string } | undefined;
      let allEquipment: Array<{ id: number; name: string; category: string; type: string; features: string[]; priceRange?: string }> = [];
      
      const products = await storage.getEquipmentProducts();
      
      if (equipmentIds.length > 0) {
        // Use selected equipment from the EquipIQ catalog
        allEquipment = products
          .filter(p => equipmentIds.includes(p.id))
          .map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            type: p.type,
            features: p.features || [],
            priceRange: p.priceRange || undefined,
          }));
        
        // For backward compatibility, set the primary equipment to the first hardware item
        const primaryHardware = allEquipment.find(e => e.category === "hardware") || allEquipment[0];
        if (primaryHardware) {
          const product = products.find(p => p.id === primaryHardware.id);
          equipment = {
            name: primaryHardware.name,
            features: primaryHardware.features,
            whySelected: `Selected from EquipIQ catalog. ${product?.bestFor?.join(", ") || "Versatile solution for your business needs."}`,
          };
        }
      } else {
        // Auto-recommend based on volume if no equipment selected
        const volume = parsedData.currentState?.totalVolume || 0;
        let recommended = products.find(p => p.isActive && p.category === "hardware");
        if (volume > 50000) {
          recommended = products.find(p => p.name?.toLowerCase().includes("z11") || p.type === "countertop");
        } else if (volume > 10000) {
          recommended = products.find(p => p.name?.toLowerCase().includes("z9") || p.type === "wireless");
        }
        if (recommended) {
          equipment = {
            name: recommended.name,
            features: recommended.features || [],
            whySelected: `Recommended based on your processing volume and business needs.`,
          };
          allEquipment = [{
            id: recommended.id,
            name: recommended.name,
            category: recommended.category,
            type: recommended.type,
            features: recommended.features || [],
            priceRange: recommended.priceRange || undefined,
          }];
        }
      }

      let blueprint = await generateProposalBlueprint(parsedData, equipment);

      if (useAI) {
        try {
          const client = getAIIntegrationsClient();
          const aiPrompt = `You are the PCBancard Proposal Generator. Create comprehensive, business-specific proposal content.

CRITICAL RULES:
1. ALL NUMBERS must come from the spreadsheet data provided — never invent data
2. If volume > 0 but fees = 0, say "Not enough data provided" — NEVER "$0 fees"
3. Use "3 to 4%" when describing typical card acceptance costs
4. Include this EXACT Dual Pricing wording for dual pricing proposals:
   "With dual pricing, you offer two prices—one for cash, one for cards. It's fully automated"
5. Every section must reference the business type AND at least 2 spreadsheet numbers
6. If data is missing, say "Not provided" — do not guess

MERCHANT DATA:
- Business Name: ${parsedData.merchantName || "Not provided"}
- Owner: ${intakeData?.merchant?.ownerName || "Not provided"}
- Industry: ${intakeData?.merchant?.industryGuess || researchData?.industryType || "General Business"}
- Website: ${intakeData?.merchant?.businessWebsite || "Not provided"}
- Current Processor: ${intakeData?.merchant?.currentProcessor || "Unknown"}
- Rep Notes: ${intakeData?.merchant?.repNotes || "None"}

BUSINESS RESEARCH:
${researchData?.businessDescription || "No additional research available."}

SPREADSHEET DATA:
- Monthly Card Volume: $${parsedData.currentState?.totalVolume?.toLocaleString() || "Not provided"}
- Current Monthly Processing Fees: $${parsedData.currentState?.totalMonthlyCost?.toLocaleString() || "Not provided"}
- Effective Rate: ${parsedData.currentState?.effectiveRatePercent?.toFixed(2) || "Not provided"}%
- Dual Pricing Monthly Cost: $${parsedData.optionDualPricing?.totalMonthlyCost?.toLocaleString() || "N/A"}
- Dual Pricing Monthly Savings: $${parsedData.optionDualPricing?.monthlySavings?.toLocaleString() || "N/A"}
- Interchange+ Monthly Cost: $${parsedData.optionInterchangePlus?.totalMonthlyCost?.toLocaleString() || "N/A"}
- Interchange+ Monthly Savings: $${parsedData.optionInterchangePlus?.monthlySavings?.toLocaleString() || "N/A"}

AGENT INFO:
- Name: ${intakeData?.agent?.firstName || ""} ${intakeData?.agent?.lastName || ""}
- Title: ${intakeData?.agent?.title || "Account Executive"}
- Phone: ${intakeData?.agent?.phone || ""}
- Email: ${intakeData?.agent?.email || ""}

Generate the following content in JSON format:

{
  "executiveSummary": "200+ words about this specific business, their industry, and the problem we're solving. Reference at least 3 numbers from the data.",
  "currentSituationNarrative": "150+ words explaining why card processing is silently draining their profits. Be specific to their industry.",
  "dualPricingExplanation": "150+ words explaining dual pricing for this specific business type. Include the exact wording required.",
  "interchangePlusExplanation": "100+ words explaining interchange plus as an alternative option.",
  "recommendation": "200+ words with 3 clear reasons why we recommend ${blueprint.savingsComparison.recommendedOption === "dual_pricing" ? "Dual Pricing" : "Interchange Plus"}. Include annual savings projection.",
  "whyPCBancard": "100+ words about PCBancard's unique value proposition.",
  "implementationPlan": ["Step 1: ...", "Step 2: ...", "Step 3: ...", "Step 4: ...", "Step 5: ..."],
  "callToAction": "75+ words compelling them to take action NOW. Include the agent's direct contact info.",
  "complianceDisclosure": "Standard compliance text about dual pricing legality and PCBancard support."
}`;

          const response = await client.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
              { role: "system", content: "You are a professional B2B sales proposal writer for PCBancard. Be persuasive but professional. Focus on value and savings. Always use real numbers from the data provided - never invent figures." },
              { role: "user", content: aiPrompt },
            ],
            max_completion_tokens: 2000,
            temperature: 0.7,
          });

          const aiContent = response.choices[0]?.message?.content || "";
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const aiEnhancements = JSON.parse(jsonMatch[0]);
            
            // Apply comprehensive AI-generated content directly to the blueprint
            if (aiEnhancements.executiveSummary) {
              blueprint.executiveSummary.intro = aiEnhancements.executiveSummary;
            }
            if (aiEnhancements.currentSituationNarrative) {
              blueprint.executiveSummary.currentSituation = aiEnhancements.currentSituationNarrative;
            }
            if (aiEnhancements.recommendation) {
              blueprint.executiveSummary.recommendation = aiEnhancements.recommendation;
            }
            if (aiEnhancements.callToAction) {
              blueprint.callToAction = aiEnhancements.callToAction;
            }
            
            // Apply additional AI content directly to blueprint fields
            if (aiEnhancements.dualPricingExplanation) {
              blueprint.dualPricingExplanation = aiEnhancements.dualPricingExplanation;
            }
            if (aiEnhancements.interchangePlusExplanation) {
              blueprint.interchangePlusExplanation = aiEnhancements.interchangePlusExplanation;
            }
            if (aiEnhancements.whyPCBancard) {
              blueprint.whyPCBancard = aiEnhancements.whyPCBancard;
            }
            if (aiEnhancements.implementationPlan && Array.isArray(aiEnhancements.implementationPlan)) {
              // Convert string array to ImplementationStep array if needed
              const steps = aiEnhancements.implementationPlan.map((step: string | any, index: number) => {
                if (typeof step === 'string') {
                  return {
                    step: index + 1,
                    title: step.replace(/^Step \d+:\s*/i, '').split(' - ')[0] || `Step ${index + 1}`,
                    description: step.replace(/^Step \d+:\s*/i, ''),
                    timeline: `Day ${index + 1}`,
                  };
                }
                return step;
              });
              blueprint.implementationPlan = steps;
            }
            if (aiEnhancements.complianceDisclosure) {
              blueprint.complianceDisclosure = aiEnhancements.complianceDisclosure;
            }
          }
        } catch (aiError: any) {
          console.error("[Proposals] AI enhancement failed:", aiError.message);
        }
      }

      // Store proposal images in the blueprint for renderers
      if (proposalImages && proposalImages.generationStatus !== "failed") {
        (blueprint as any).images = {
          heroBanner: proposalImages.heroBanner,
          comparisonBackground: proposalImages.comparisonBackground,
          trustVisual: proposalImages.trustVisual,
          generationStatus: proposalImages.generationStatus,
        };
      }

      const proposal = await storage.createProposal({
        userId,
        organizationId: membership.orgId,
        merchantName: parsedData.merchantName,
        agentName: parsedData.agentName || req.user.claims.name || undefined,
        agentTitle: parsedData.agentTitle || "Account Executive",
        currentState: parsedData.currentState,
        optionInterchangePlus: parsedData.optionInterchangePlus,
        optionDualPricing: parsedData.optionDualPricing,
        selectedTerminalId: equipmentIds.length > 0 ? equipmentIds[0] : undefined,
        terminalName: allEquipment.length > 0 ? allEquipment.map(e => e.name).join(", ") : equipment?.name,
        terminalFeatures: equipment?.features,
        whySelected: equipment?.whySelected,
        proposalBlueprint: blueprint,
        status: "draft",
      });

      let gammaUrl: string | undefined;
      let fallback = false;
      let fallbackReason: string | undefined;

      if (renderer === "gamma") {
        try {
          const { createGammaRenderer, isGammaConfigured } = await import("./gamma-renderer");
          
          if (isGammaConfigured()) {
            const gammaRenderer = createGammaRenderer();
            if (gammaRenderer) {
              const gammaBlueprint = {
                cover: {
                  headline: blueprint.cover.headline,
                  subheadline: blueprint.cover.subheadline,
                  merchantName: blueprint.cover.merchantName,
                  preparedBy: blueprint.cover.agentName,
                  date: blueprint.cover.preparedDate,
                },
                executiveSummary: {
                  opening: blueprint.executiveSummary.intro,
                  keyFindings: [
                    `Current monthly processing cost: $${parsedData.currentState?.totalMonthlyCost?.toLocaleString() || "N/A"}`,
                    `Total monthly volume: $${parsedData.currentState?.totalVolume?.toLocaleString() || "N/A"}`,
                    `Potential monthly savings: $${Math.max(blueprint.savingsComparison.dualPricingSavings || 0, blueprint.savingsComparison.interchangePlusSavings || 0).toLocaleString()}`,
                  ],
                  recommendation: blueprint.executiveSummary.recommendation,
                },
                currentSituation: {
                  narrative: blueprint.executiveSummary.currentSituation,
                  tableRows: [
                    ["Visa", `$${parsedData.currentState?.cardBreakdown?.visa?.volume?.toLocaleString() || "0"}`, `${parsedData.currentState?.cardBreakdown?.visa?.ratePercent || 0}%`, `$${parsedData.currentState?.cardBreakdown?.visa?.totalCost?.toLocaleString() || "0"}`],
                    ["Mastercard", `$${parsedData.currentState?.cardBreakdown?.mastercard?.volume?.toLocaleString() || "0"}`, `${parsedData.currentState?.cardBreakdown?.mastercard?.ratePercent || 0}%`, `$${parsedData.currentState?.cardBreakdown?.mastercard?.totalCost?.toLocaleString() || "0"}`],
                    ["Discover", `$${parsedData.currentState?.cardBreakdown?.discover?.volume?.toLocaleString() || "0"}`, `${parsedData.currentState?.cardBreakdown?.discover?.ratePercent || 0}%`, `$${parsedData.currentState?.cardBreakdown?.discover?.totalCost?.toLocaleString() || "0"}`],
                    ["Amex", `$${parsedData.currentState?.cardBreakdown?.amex?.volume?.toLocaleString() || "0"}`, `${parsedData.currentState?.cardBreakdown?.amex?.ratePercent || 0}%`, `$${parsedData.currentState?.cardBreakdown?.amex?.totalCost?.toLocaleString() || "0"}`],
                  ],
                  totalMonthly: `$${parsedData.currentState?.totalMonthlyCost?.toLocaleString() || "0"}`,
                  effectiveRate: `${parsedData.currentState?.effectiveRatePercent?.toFixed(2) || "0"}%`,
                },
                optionDualPricing: parsedData.optionDualPricing ? {
                  title: "Dual Pricing Program",
                  tagline: "Eliminate Processing Costs Entirely",
                  howItWorks: "Display separate cash and credit prices. Customers who pay with credit cover the processing fee, while cash customers enjoy a discount.",
                  benefits: [
                    "Eliminate up to 100% of processing fees",
                    "Increase profit margins immediately",
                    "Fully compliant with all regulations",
                    "Simple signage and customer education",
                  ],
                  costs: {
                    monthlyProgramFee: `$${parsedData.optionDualPricing?.monthlyProgramFee?.toFixed(2) || "64.95"}`,
                    processingCost: "$0.00",
                    totalMonthly: `$${parsedData.optionDualPricing?.totalMonthlyCost?.toFixed(2) || "64.95"}`,
                  },
                  savings: {
                    monthly: `$${parsedData.optionDualPricing?.monthlySavings?.toLocaleString() || "0"}`,
                    annual: `$${parsedData.optionDualPricing?.annualSavings?.toLocaleString() || "0"}`,
                  },
                } : undefined,
                optionInterchangePlus: parsedData.optionInterchangePlus ? {
                  title: "Interchange Plus Pricing",
                  tagline: "Transparent, Competitive Rates",
                  howItWorks: "Pay the true wholesale interchange rate plus a small fixed markup. No hidden fees, complete transparency.",
                  benefits: [
                    "Transparent pricing structure",
                    "Lower rates on qualified transactions",
                    "No annual fee increases",
                    "Full statement transparency",
                  ],
                  costs: {
                    rate: `${parsedData.optionInterchangePlus?.discountRatePercent || 0}%`,
                    perTransaction: `$${parsedData.optionInterchangePlus?.perTransactionFee?.toFixed(2) || "0.10"}`,
                    totalMonthly: `$${parsedData.optionInterchangePlus?.totalMonthlyCost?.toLocaleString() || "0"}`,
                  },
                  savings: {
                    monthly: `$${parsedData.optionInterchangePlus?.monthlySavings?.toLocaleString() || "0"}`,
                    annual: `$${parsedData.optionInterchangePlus?.annualSavings?.toLocaleString() || "0"}`,
                  },
                } : undefined,
                comparisonTable: {
                  rows: [
                    ["Monthly Cost", `$${parsedData.currentState?.totalMonthlyCost?.toLocaleString() || "0"}`, `$${parsedData.optionDualPricing?.totalMonthlyCost?.toFixed(2) || "N/A"}`, `$${parsedData.optionInterchangePlus?.totalMonthlyCost?.toLocaleString() || "N/A"}`],
                    ["Monthly Savings", "-", `$${parsedData.optionDualPricing?.monthlySavings?.toLocaleString() || "0"}`, `$${parsedData.optionInterchangePlus?.monthlySavings?.toLocaleString() || "0"}`],
                    ["Annual Savings", "-", `$${parsedData.optionDualPricing?.annualSavings?.toLocaleString() || "0"}`, `$${parsedData.optionInterchangePlus?.annualSavings?.toLocaleString() || "0"}`],
                  ],
                },
                equipment: equipment ? {
                  title: "Recommended Equipment",
                  terminalName: equipment.name,
                  whyRecommended: equipment.whySelected,
                  features: equipment.features,
                } : undefined,
                nextSteps: {
                  steps: [
                    "Review this proposal with your team",
                    "Choose your preferred pricing option",
                    "Sign the merchant agreement",
                    "Schedule terminal installation",
                  ],
                  ctaPrimary: "Ready to start saving?",
                  ctaSecondary: `Contact ${parsedData.agentName || "your PCBancard representative"} today to get started!`,
                },
                disclosures: [
                  "Savings estimates based on provided statement data",
                  "Actual savings may vary based on card mix and transaction patterns",
                  "All rates subject to application approval",
                ],
              };

              const result = await gammaRenderer.generateProposal(gammaBlueprint, {
                exportAs: format === "pptx" ? "pptx" : "pdf",
              });

              if (result.success) {
                gammaUrl = result.gammaUrl;
              } else {
                fallback = true;
                fallbackReason = result.error || "Gamma generation failed";
              }
            }
          } else {
            fallback = true;
            fallbackReason = "Gamma API not configured";
          }
        } catch (gammaError: any) {
          console.error("[Proposals] Gamma generation failed:", gammaError.message);
          fallback = true;
          fallbackReason = gammaError.message || "Gamma generation failed";
        }
      }

      res.json({
        success: true,
        id: proposal.id,
        proposal,
        blueprint,
        gammaUrl,
        fallback,
        fallbackReason,
      });
    } catch (error: any) {
      console.error("[Proposals] Error generating proposal:", error);
      res.status(500).json({ error: "Failed to generate proposal: " + (error.message || "Unknown error") });
    }
  });

  app.get("/api/proposals", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;

      const isAdmin = membership.role === "master_admin" || membership.role === "relationship_manager";

      let proposals;
      if (isAdmin) {
        proposals = await storage.getProposalsByOrganization(membership.orgId);
      } else {
        proposals = await storage.getProposalsByUser(userId);
      }

      res.json(proposals);
    } catch (error: any) {
      console.error("[Proposals] Error fetching proposals:", error);
      res.status(500).json({ error: "Failed to fetch proposals" });
    }
  });

  app.get("/api/proposals/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid proposal ID" });
      }

      const proposal = await storage.getProposal(id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      if (proposal.organizationId !== membership.orgId) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      res.json(proposal);
    } catch (error: any) {
      console.error("[Proposals] Error fetching proposal:", error);
      res.status(500).json({ error: "Failed to fetch proposal" });
    }
  });

  // Claude-powered document generation endpoint
  app.post("/api/proposals/:id/generate-claude", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const id = parseInt(req.params.id);
      const { format = "pdf", agentName, agentTitle, agentEmail, agentPhone, businessName, businessAddress, businessDescription, selectedEquipment } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid proposal ID" });
      }

      if (format !== "pdf" && format !== "docx") {
        return res.status(400).json({ error: "Format must be 'pdf' or 'docx'" });
      }

      const proposal = await storage.getProposal(id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      if (proposal.organizationId !== membership.orgId) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      const { generateClaudeDocument } = await import("./services/claude-document-generator");
      const { convertHtmlToPdf, generateDocx } = await import("./services/document-converter");

      const parsedData = {
        merchantName: businessName || proposal.merchantName,
        preparedDate: proposal.preparedDate,
        agentName: proposal.agentName,
        agentTitle: proposal.agentTitle,
        currentState: proposal.currentState,
        optionInterchangePlus: proposal.optionInterchangePlus,
        optionDualPricing: proposal.optionDualPricing,
        proposalType: proposal.optionDualPricing ? "dual_pricing" : "interchange_plus",
      } as any;

      console.log("[Proposals] Generating Claude document for:", parsedData.merchantName);

      // Generate beautiful proposal content with Claude
      const claudeDoc = await generateClaudeDocument({
        parsedData,
        agentName: agentName || proposal.agentName || "PCBancard Representative",
        agentTitle: agentTitle || proposal.agentTitle || "Account Executive",
        agentEmail: agentEmail || "",
        agentPhone: agentPhone || "",
        businessName: businessName || proposal.merchantName,
        businessAddress,
        businessDescription,
        selectedEquipment,
      });

      let buffer: Buffer;
      let contentType: string;
      let filename: string;
      const safeMerchantName = (businessName || proposal.merchantName).replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
      const today = new Date().toISOString().split("T")[0];

      if (format === "pdf") {
        buffer = await convertHtmlToPdf(claudeDoc.html);
        contentType = "application/pdf";
        filename = `PCBancard_Proposal_${safeMerchantName}_${today}.pdf`;
      } else {
        buffer = await generateDocx({
          merchantName: businessName || proposal.merchantName,
          businessAddress,
          sections: claudeDoc.sections,
          parsedData,
          agentName: agentName || proposal.agentName || "PCBancard Representative",
          agentTitle: agentTitle || proposal.agentTitle || "Account Executive",
          agentEmail: agentEmail || "",
          agentPhone: agentPhone || "",
          date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          equipmentList: selectedEquipment,
        });
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        filename = `PCBancard_Proposal_${safeMerchantName}_${today}.docx`;
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error: any) {
      console.error("[Proposals] Error generating Claude document:", error);
      res.status(500).json({ error: "Failed to generate document: " + (error.message || "Unknown error") });
    }
  });

  // Validation schema for Claude direct generation
  const claudeGenerateSchema = z.object({
    parsedData: z.object({
      merchantName: z.string().optional(),
      currentState: z.object({
        totalVolume: z.number().optional(),
        totalTransactions: z.number().optional(),
        avgTicket: z.number().optional(),
        totalMonthlyCost: z.number().optional(),
        effectiveRatePercent: z.number().optional(),
      }).optional(),
      optionDualPricing: z.object({
        monthlySavings: z.number().optional(),
        annualSavings: z.number().optional(),
        totalMonthlyCost: z.number().optional(),
      }).optional(),
      optionInterchangePlus: z.object({
        monthlySavings: z.number().optional(),
        annualSavings: z.number().optional(),
        totalMonthlyCost: z.number().optional(),
      }).optional(),
    }).passthrough(),
    format: z.enum(["pdf", "docx"]).default("pdf"),
    agentName: z.string().optional(),
    agentTitle: z.string().optional(),
    agentEmail: z.string().optional(),
    agentPhone: z.string().optional(),
    businessName: z.string().optional(),
    businessAddress: z.string().optional(),
    businessDescription: z.string().optional(),
    merchantWebsiteUrl: z.string().optional(),
    selectedEquipment: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      price: z.string().optional(),
    })).optional(),
  });

  // Direct Claude document generation (without saved proposal)
  app.post("/api/proposals/generate-claude-direct", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const validationResult = claudeGenerateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request data: " + validationResult.error.message });
      }

      const { parsedData, format, agentName, agentTitle, agentEmail, agentPhone, businessName, businessAddress, businessDescription, merchantWebsiteUrl, selectedEquipment } = validationResult.data;

      const { generateClaudeDocument } = await import("./services/claude-document-generator");
      const { convertHtmlToPdf, generateDocx } = await import("./services/document-converter");

      const merchantName = businessName || parsedData.merchantName || "Valued Merchant";

      console.log("[Proposals] Generating direct Claude document for:", merchantName);

      // Scrape merchant website if URL provided for enriched proposal content
      let scrapedData: { description?: string; address?: string; phone?: string; logoUrl?: string } = {};
      if (merchantWebsiteUrl) {
        console.log("[Proposals] Scraping merchant website:", merchantWebsiteUrl);
        try {
          const scraped = await scrapeMerchantWebsite(merchantWebsiteUrl);
          scrapedData = {
            description: scraped.data.businessDescription ?? undefined,
            address: scraped.data.address ?? undefined,
            phone: scraped.data.phone ?? undefined,
            logoUrl: scraped.data.logoUrl ?? undefined,
          };
          console.log("[Proposals] Website scraped successfully:", {
            hasDescription: !!scrapedData.description,
            hasAddress: !!scrapedData.address,
            hasPhone: !!scrapedData.phone,
            hasLogo: !!scrapedData.logoUrl,
          });
        } catch (scrapeError: any) {
          console.log("[Proposals] Website scraping failed, continuing without:", scrapeError.message);
        }
      }

      // Use scraped data to enrich the proposal - prefer scraped data over manual input
      const enrichedDescription = scrapedData.description || businessDescription;
      const enrichedAddress = scrapedData.address || businessAddress;

      // Generate beautiful proposal content with Claude
      const fullParsedData = {
        ...parsedData,
        preparedDate: new Date(),
        agentName: agentName || "PCBancard Representative",
        agentTitle: agentTitle || "Account Executive",
        proposalType: parsedData.optionDualPricing ? "dual_pricing" : "interchange_plus",
      } as const;

      const claudeDoc = await generateClaudeDocument({
        parsedData: fullParsedData as any,
        agentName: agentName || "PCBancard Representative",
        agentTitle: agentTitle || "Account Executive",
        agentEmail: agentEmail || "",
        agentPhone: agentPhone || "",
        businessName: merchantName,
        businessAddress: enrichedAddress,
        businessDescription: enrichedDescription,
        selectedEquipment,
      });

      let buffer: Buffer;
      let contentType: string;
      let filename: string;
      const safeMerchantName = merchantName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
      const today = new Date().toISOString().split("T")[0];

      if (format === "pdf") {
        buffer = await convertHtmlToPdf(claudeDoc.html);
        contentType = "application/pdf";
        filename = `PCBancard_Proposal_${safeMerchantName}_${today}.pdf`;
      } else {
        buffer = await generateDocx({
          merchantName,
          businessAddress,
          sections: claudeDoc.sections,
          parsedData: fullParsedData as any,
          agentName: agentName || "PCBancard Representative",
          agentTitle: agentTitle || "Account Executive",
          agentEmail: agentEmail || "",
          agentPhone: agentPhone || "",
          date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          equipmentList: selectedEquipment,
        });
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        filename = `PCBancard_Proposal_${safeMerchantName}_${today}.docx`;
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error: any) {
      console.error("[Proposals] Error generating direct Claude document:", error);
      res.status(500).json({ error: "Failed to generate document: " + (error.message || "Unknown error") });
    }
  });

  app.get("/api/proposals/:id/download/:format", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const id = parseInt(req.params.id);
      const format = req.params.format?.toLowerCase();

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid proposal ID" });
      }

      if (format !== "pdf" && format !== "docx") {
        return res.status(400).json({ error: "Format must be 'pdf' or 'docx'" });
      }

      const proposal = await storage.getProposal(id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      if (proposal.organizationId !== membership.orgId) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      const { generateProposalPDF, generateProposalDOCX } = await import("./proposal-generator");

      const blueprint = proposal.proposalBlueprint as any;
      const parsedData = {
        merchantName: proposal.merchantName,
        preparedDate: proposal.preparedDate,
        agentName: proposal.agentName,
        agentTitle: proposal.agentTitle,
        currentState: proposal.currentState,
        optionInterchangePlus: proposal.optionInterchangePlus,
        optionDualPricing: proposal.optionDualPricing,
        proposalType: proposal.optionDualPricing ? "dual_pricing" : "interchange_plus",
      } as any;

      let buffer: Buffer;
      let contentType: string;
      let filename: string;

      const safeMerchantName = proposal.merchantName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);

      if (format === "pdf") {
        buffer = await generateProposalPDF(blueprint, parsedData);
        contentType = "application/pdf";
        filename = `PCBancard_Proposal_${safeMerchantName}.pdf`;
      } else {
        buffer = await generateProposalDOCX(blueprint, parsedData);
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        filename = `PCBancard_Proposal_${safeMerchantName}.docx`;
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error: any) {
      console.error("[Proposals] Error downloading proposal:", error);
      res.status(500).json({ error: "Failed to download proposal: " + (error.message || "Unknown error") });
    }
  });

  app.patch("/api/proposals/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid proposal ID" });
      }

      const proposal = await storage.getProposal(id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      // Check org membership
      if (proposal.organizationId !== membership.orgId) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      // Non-admins can only update their own proposals
      const isAdmin = membership.role === "master_admin" || membership.role === "relationship_manager";
      if (!isAdmin && proposal.userId !== userId) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      const { status, merchantId } = req.body;
      const updateData: any = {};
      if (status && ["draft", "generated", "sent"].includes(status)) {
        updateData.status = status;
      }
      if (merchantId !== undefined) {
        if (merchantId === null) {
          updateData.merchantId = null;
        } else {
          const merchant = await storage.getMerchant(merchantId);
          if (merchant && merchant.orgId === membership.orgId) {
            updateData.merchantId = merchantId;
          }
        }
      }

      const updated = await storage.updateProposal(id, updateData);
      res.json(updated);
    } catch (error: any) {
      console.error("[Proposals] Error updating proposal:", error);
      res.status(500).json({ error: "Failed to update proposal" });
    }
  });

  app.delete("/api/proposals/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid proposal ID" });
      }

      const proposal = await storage.getProposal(id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      if (proposal.organizationId !== membership.orgId) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      await storage.deleteProposal(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Proposals] Error deleting proposal:", error);
      res.status(500).json({ error: "Failed to delete proposal" });
    }
  });

  // ============================================
  // Statement Extractions / Analyses Routes
  // ============================================

  // Get all statement extractions for the user
  app.get("/api/statement-analyses", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;

      const isAdmin = membership.role === "master_admin" || membership.role === "relationship_manager";

      let analyses;
      if (isAdmin) {
        analyses = await storage.getStatementExtractionsByOrganization(membership.orgId);
      } else {
        analyses = await storage.getStatementExtractionsByUser(userId);
      }

      res.json(analyses);
    } catch (error: any) {
      console.error("[Analyses] Error fetching analyses:", error);
      res.status(500).json({ error: "Failed to fetch analyses" });
    }
  });

  // Get single statement extraction
  app.get("/api/statement-analyses/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      const analysis = await storage.getStatementExtraction(id);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Check org membership
      if (analysis.orgId !== membership.orgId) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Non-admins can only see their own analyses
      const isAdmin = membership.role === "master_admin" || membership.role === "relationship_manager";
      if (!isAdmin && analysis.userId !== userId) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      res.json(analysis);
    } catch (error: any) {
      console.error("[Analyses] Error fetching analysis:", error);
      res.status(500).json({ error: "Failed to fetch analysis" });
    }
  });

  // Update statement extraction (for merchant association)
  app.patch("/api/statement-analyses/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      const analysis = await storage.getStatementExtraction(id);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Check org membership
      if (analysis.orgId !== membership.orgId) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Non-admins can only update their own analyses
      const isAdmin = membership.role === "master_admin" || membership.role === "relationship_manager";
      if (!isAdmin && analysis.userId !== userId) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      const { merchantId } = req.body;
      const updateData: any = {};
      
      if (merchantId !== undefined) {
        if (merchantId === null) {
          updateData.merchantId = null;
        } else {
          const merchant = await storage.getMerchant(merchantId);
          if (merchant && merchant.orgId === membership.orgId) {
            updateData.merchantId = merchantId;
          }
        }
      }

      const updated = await storage.updateStatementExtraction(id, updateData);
      res.json(updated);
    } catch (error: any) {
      console.error("[Analyses] Error updating analysis:", error);
      res.status(500).json({ error: "Failed to update analysis" });
    }
  });

  // Get combined work history (proposals + analyses)
  app.get("/api/work-history", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;

      const isAdmin = membership.role === "master_admin" || membership.role === "relationship_manager";

      let proposals, analyses;
      if (isAdmin) {
        [proposals, analyses] = await Promise.all([
          storage.getProposalsByOrganization(membership.orgId),
          storage.getStatementExtractionsByOrganization(membership.orgId)
        ]);
      } else {
        [proposals, analyses] = await Promise.all([
          storage.getProposalsByUser(userId),
          storage.getStatementExtractionsByUser(userId)
        ]);
      }

      // Combine and sort by date
      const workItems = [
        ...proposals.map(p => ({
          type: 'proposal' as const,
          id: p.id,
          merchantName: p.merchantName,
          merchantId: p.merchantId,
          status: p.status,
          createdAt: p.createdAt,
          pdfUrl: p.pdfUrl,
          docxUrl: p.docxUrl,
        })),
        ...analyses.map(a => ({
          type: 'analysis' as const,
          id: a.id,
          merchantName: a.extractedData?.merchantName || 'Unknown',
          merchantId: a.merchantId,
          processorName: a.processorName,
          totalVolume: a.extractedData?.totalVolume,
          createdAt: a.createdAt,
        }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(workItems);
    } catch (error: any) {
      console.error("[Work History] Error fetching work history:", error);
      res.status(500).json({ error: "Failed to fetch work history" });
    }
  });

  // Get proposals and analyses for a specific merchant
  app.get("/api/merchants/:id/work", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const merchantId = parseInt(req.params.id);

      if (isNaN(merchantId)) {
        return res.status(400).json({ error: "Invalid merchant ID" });
      }

      const merchant = await storage.getMerchant(merchantId);
      if (!merchant || merchant.orgId !== membership.orgId) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const [proposals, analyses] = await Promise.all([
        storage.getProposalsByMerchant(merchantId),
        storage.getStatementExtractionsByMerchant(merchantId)
      ]);

      res.json({ proposals, analyses });
    } catch (error: any) {
      console.error("[Merchant Work] Error fetching merchant work:", error);
      res.status(500).json({ error: "Failed to fetch merchant work" });
    }
  });

  // ============================================
  // E-Signature Document Library Routes
  // ============================================
  const { esignService } = await import("./esign/esign-service");

  // Get document templates
  app.get("/api/esign/templates", isAuthenticated, async (_req: any, res) => {
    try {
      const templates = esignService.getDocumentTemplates();
      res.json(templates);
    } catch (error: any) {
      console.error("[E-Sign] Error fetching templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Get document packages
  app.get("/api/esign/packages", isAuthenticated, async (_req: any, res) => {
    try {
      const packages = esignService.getDocumentPackages();
      res.json(packages);
    } catch (error: any) {
      console.error("[E-Sign] Error fetching packages:", error);
      res.status(500).json({ error: "Failed to fetch packages" });
    }
  });

  // Get single template by ID
  app.get("/api/esign/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const template = esignService.getDocumentTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      console.error("[E-Sign] Error fetching template:", error);
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  // Get package by ID with its documents
  app.get("/api/esign/packages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const pkg = esignService.getDocumentPackage(req.params.id);
      if (!pkg) {
        return res.status(404).json({ error: "Package not found" });
      }
      const documents = esignService.getPackageTemplates(req.params.id);
      res.json({ ...pkg, documents });
    } catch (error: any) {
      console.error("[E-Sign] Error fetching package:", error);
      res.status(500).json({ error: "Failed to fetch package" });
    }
  });

  // Get available providers
  app.get("/api/esign/providers", isAuthenticated, async (_req: any, res) => {
    try {
      const providers = esignService.getAvailableProviders();
      res.json({ providers });
    } catch (error: any) {
      console.error("[E-Sign] Error fetching providers:", error);
      res.status(500).json({ error: "Failed to fetch providers" });
    }
  });

  // ============================================
  // SignNow Template Management Routes
  // ============================================

  // List SignNow templates from user's account
  app.get("/api/esign/signnow/templates", isAuthenticated, async (_req: any, res) => {
    try {
      const result = await esignService.listSignNowTemplates();
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({ templates: result.templates });
    } catch (error: any) {
      console.error("[E-Sign] Error listing SignNow templates:", error);
      res.status(500).json({ error: "Failed to list SignNow templates" });
    }
  });

  // Link a SignNow template to a document template
  app.post("/api/esign/templates/:id/link-signnow", isAuthenticated, async (req: any, res) => {
    try {
      const { signNowTemplateId } = req.body;
      const result = await esignService.linkSignNowTemplate(req.params.id, signNowTemplateId || null);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("[E-Sign] Error linking SignNow template:", error);
      res.status(500).json({ error: "Failed to link SignNow template" });
    }
  });

  // Get template with SignNow info
  app.get("/api/esign/templates/:id/signnow-info", isAuthenticated, async (req: any, res) => {
    try {
      const result = await esignService.getDocumentTemplateWithSignNow(req.params.id);
      res.json(result);
    } catch (error: any) {
      console.error("[E-Sign] Error getting template SignNow info:", error);
      res.status(500).json({ error: "Failed to get template info" });
    }
  });

  // Create new e-signature request
  app.post("/api/esign/requests", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;
      const orgId = membership.orgId;
      
      const request = await esignService.createRequest({
        orgId: orgId,
        agentId: userId,
        merchantId: req.body.merchantId || null,
        dealId: req.body.dealId || null,
        documentIds: req.body.documentIds || [],
        packageId: req.body.packageId || null,
        merchantName: req.body.merchantName || null,
        merchantEmail: req.body.merchantEmail || null,
        merchantPhone: req.body.merchantPhone || null,
        fieldValues: req.body.fieldValues || {},
        signers: req.body.signers || []
      });
      
      // If linked to a deal, create deal attachment and activity
      if (req.body.dealId) {
        try {
          // Create deal attachment for the e-sign document
          const docNames = (req.body.documentIds || []).join(", ") || "E-Sign Documents";
          await storage.createDealAttachment({
            dealId: req.body.dealId,
            attachmentType: "esign_document",
            attachmentId: request.id,
            name: `E-Sign Request: ${req.body.merchantName || docNames}`,
            createdBy: userId,
          });
          
          // Create deal activity
          await storage.createDealActivity({
            dealId: req.body.dealId,
            organizationId: orgId,
            activityType: "esign_created",
            agentId: userId,
            description: `E-signature request created for: ${req.body.merchantName || "Merchant"}`,
          });
          
          // Update deal's esignStatus to 'draft'
          await storage.updateDeal(req.body.dealId, {
            esignStatus: "draft",
          });
        } catch (linkError) {
          console.error("[E-Sign] Error linking to deal:", linkError);
          // Don't fail the request, just log the error
        }
      }
      
      res.json(request);
    } catch (error: any) {
      console.error("[E-Sign] Error creating request:", error);
      res.status(500).json({ error: "Failed to create request" });
    }
  });

  // Get all e-signature requests for user
  app.get("/api/esign/requests", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;
      
      let requests;
      if (membership.role === "master_admin") {
        requests = await esignService.getOrgRequests(membership.orgId);
      } else {
        requests = await esignService.getAgentRequests(userId);
      }
      
      res.json(requests);
    } catch (error: any) {
      console.error("[E-Sign] Error fetching requests:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  // Get single e-signature request
  app.get("/api/esign/requests/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid request ID" });
      }
      
      const request = await esignService.getRequest(id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      // Check permissions
      if (request.orgId !== membership.orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (membership.role !== "master_admin" && request.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(request);
    } catch (error: any) {
      console.error("[E-Sign] Error fetching request:", error);
      res.status(500).json({ error: "Failed to fetch request" });
    }
  });

  // Get requests for merchant
  app.get("/api/esign/merchants/:merchantId/requests", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const merchantId = parseInt(req.params.merchantId);
      
      if (isNaN(merchantId)) {
        return res.status(400).json({ error: "Invalid merchant ID" });
      }
      
      const requests = await esignService.getMerchantRequests(merchantId);
      res.json(requests);
    } catch (error: any) {
      console.error("[E-Sign] Error fetching merchant requests:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  // Update e-signature request
  app.patch("/api/esign/requests/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;
      const orgId = membership.orgId;
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid request ID" });
      }
      
      const request = await esignService.getRequest(id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      // Check permissions
      if (request.orgId !== membership.orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (membership.role !== "master_admin" && request.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const previousStatus = request.status;
      const updated = await esignService.updateRequest(id, req.body);
      
      // If the request is linked to a deal and status changed, sync with deal
      if (updated && updated.dealId && req.body.status && req.body.status !== previousStatus) {
        try {
          // Map e-sign status to deal esignStatus
          const statusMap: Record<string, string> = {
            draft: "draft",
            pending_send: "draft",
            sent: "sent",
            viewed: "viewed",
            partially_signed: "viewed",
            completed: "completed",
            declined: "declined",
            expired: "expired",
            voided: "voided"
          };
          
          const dealEsignStatus = statusMap[req.body.status] || req.body.status;
          const dealUpdateData: Record<string, any> = { esignStatus: dealEsignStatus };
          
          // Add timestamps based on status
          if (req.body.status === "sent") {
            dealUpdateData.esignSentAt = new Date();
          } else if (req.body.status === "viewed") {
            dealUpdateData.esignViewedAt = new Date();
          } else if (req.body.status === "completed") {
            dealUpdateData.esignSignedAt = new Date();
            if (updated.signedDocumentUrl) {
              dealUpdateData.signedApplicationUrl = updated.signedDocumentUrl;
            }
          }
          
          await storage.updateDeal(updated.dealId, dealUpdateData);
          
          // Create deal activity for the status change
          const statusLabels: Record<string, string> = {
            draft: "E-sign draft created",
            pending_send: "E-sign pending send",
            sent: "E-sign documents sent",
            viewed: "E-sign documents viewed by signer",
            partially_signed: "E-sign partially signed",
            completed: "E-sign documents signed and completed",
            declined: "E-sign declined by signer",
            expired: "E-sign request expired",
            voided: "E-sign request voided"
          };
          
          await storage.createDealActivity({
            dealId: updated.dealId,
            organizationId: orgId,
            activityType: "esign_status_change",
            agentId: userId,
            description: statusLabels[req.body.status] || `E-sign status changed to: ${req.body.status}`,
          });
        } catch (syncError) {
          console.error("[E-Sign] Error syncing status with deal:", syncError);
          // Don't fail the request, just log the error
        }
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("[E-Sign] Error updating request:", error);
      res.status(500).json({ error: "Failed to update request" });
    }
  });

  // Update field values
  app.patch("/api/esign/requests/:id/fields", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid request ID" });
      }
      
      const updated = await esignService.updateFieldValues(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("[E-Sign] Error updating fields:", error);
      res.status(500).json({ error: "Failed to update fields" });
    }
  });

  // Add signer to request
  app.post("/api/esign/requests/:id/signers", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid request ID" });
      }
      
      const updated = await esignService.addSigner(id, {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role
      });
      res.json(updated);
    } catch (error: any) {
      console.error("[E-Sign] Error adding signer:", error);
      res.status(500).json({ error: "Failed to add signer" });
    }
  });

  // Remove signer from request
  app.delete("/api/esign/requests/:id/signers/:signerId", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid request ID" });
      }
      
      const updated = await esignService.removeSigner(id, req.params.signerId);
      res.json(updated);
    } catch (error: any) {
      console.error("[E-Sign] Error removing signer:", error);
      res.status(500).json({ error: "Failed to remove signer" });
    }
  });

  // Send for signature
  app.post("/api/esign/requests/:id/send", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;
      const orgId = membership.orgId;
      const id = parseInt(req.params.id);
      console.log("[E-Sign] Received send request for ID:", id, "body:", JSON.stringify(req.body));
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid request ID" });
      }
      
      const result = await esignService.sendForSignature({
        requestId: id,
        provider: req.body.provider || "signnow",
        subject: req.body.subject,
        message: req.body.message,
        expirationDays: req.body.expirationDays
      });
      
      console.log("[E-Sign] Send result:", JSON.stringify(result));
      
      if (!result.success) {
        console.error("[E-Sign] Send failed:", result.error);
        return res.status(400).json({ error: result.error });
      }
      
      const request = await esignService.getRequest(id);
      
      // Sync with deal if linked
      if (request && request.dealId) {
        try {
          await storage.updateDeal(request.dealId, {
            esignStatus: "sent",
            esignSentAt: new Date(),
          });
          
          await storage.createDealActivity({
            dealId: request.dealId,
            organizationId: orgId,
            activityType: "esign_status_change",
            agentId: userId,
            description: "E-sign documents sent for signature",
          });
        } catch (syncError) {
          console.error("[E-Sign] Error syncing send status with deal:", syncError);
        }
      }
      
      res.json(request);
    } catch (error: any) {
      console.error("[E-Sign] Error sending for signature:", error?.message || error);
      res.status(500).json({ error: "Failed to send for signature" });
    }
  });

  // Void request
  app.post("/api/esign/requests/:id/void", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;
      const orgId = membership.orgId;
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid request ID" });
      }
      
      // Get request before voiding to check for dealId
      const requestBefore = await esignService.getRequest(id);
      
      const updated = await esignService.voidRequest(id);
      
      // Sync with deal if linked
      if (requestBefore && requestBefore.dealId) {
        try {
          await storage.updateDeal(requestBefore.dealId, {
            esignStatus: "voided",
          });
          
          await storage.createDealActivity({
            dealId: requestBefore.dealId,
            organizationId: orgId,
            activityType: "esign_status_change",
            agentId: userId,
            description: "E-sign request voided",
          });
        } catch (syncError) {
          console.error("[E-Sign] Error syncing void status with deal:", syncError);
        }
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("[E-Sign] Error voiding request:", error);
      res.status(500).json({ error: "Failed to void request" });
    }
  });

  // Check status
  app.get("/api/esign/requests/:id/status", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid request ID" });
      }
      
      const status = await esignService.checkStatus(id);
      res.json(status);
    } catch (error: any) {
      console.error("[E-Sign] Error checking status:", error);
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  // Download signed document
  app.get("/api/esign/requests/:id/download", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid request ID" });
      }
      
      const result = await esignService.downloadSignedDocument(id);
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      res.json({ url: result.url });
    } catch (error: any) {
      console.error("[E-Sign] Error downloading document:", error);
      res.status(500).json({ error: "Failed to download document" });
    }
  });

  // Get statistics
  app.get("/api/esign/stats", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const stats = await esignService.getStats(membership.orgId);
      res.json(stats);
    } catch (error: any) {
      console.error("[E-Sign] Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // AI Help Chatbot
  app.post("/api/help/chat", isAuthenticated, async (req: any, res) => {
    try {
      const { message, conversationHistory = [] } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }
      
      const { getHelpResponse } = await import("./services/help-chatbot");
      const response = await getHelpResponse(message, conversationHistory);
      
      res.json({ response });
    } catch (error: any) {
      console.error("[Help Chatbot] Error:", error);
      res.status(500).json({ error: "Failed to get response. Please try again." });
    }
  });

  // ============================================
  // AI-Powered Prospect Finder Routes
  // ============================================

  // Get MCC codes for UI
  app.get("/api/prospects/mcc-codes", isAuthenticated, async (req, res) => {
    try {
      const mccData = await import("./data/mcc-codes.json");
      res.json({
        categories: mccData.categories,
        codes: mccData.mccCodes,
      });
    } catch (error: any) {
      console.error("[Prospects] Error loading MCC codes:", error);
      res.status(500).json({ error: "Failed to load business types" });
    }
  });

  // Search for new prospects using AI
  app.post("/api/prospects/search", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const { zipCode, mccCodes: selectedCodes, radius = 10, maxResults = 25 } = req.body;
      const membership = req.orgMembership as OrgMembershipInfo;

      if (!zipCode || !selectedCodes?.length) {
        return res.status(400).json({ error: "Zip code and at least one business type required" });
      }

      // Validate zip code format
      if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
        return res.status(400).json({ error: "Invalid zip code format" });
      }

      const mccData = await import("./data/mcc-codes.json");
      const businessTypes = mccData.mccCodes
        .filter((mcc: any) => selectedCodes.includes(mcc.code))
        .map((mcc: any) => ({
          code: mcc.code,
          name: mcc.title,
          searchTerms: mcc.searchTerms || [],
        }));

      if (!businessTypes.length) {
        return res.status(400).json({ error: "Invalid business types provided" });
      }

      const { searchLocalBusinesses } = await import("./services/prospect-search");
      const results = await searchLocalBusinesses({
        zipCode,
        businessTypes,
        radius: Math.min(radius, 25),
        maxResults: Math.min(maxResults, 100),
        agentId: req.user.claims.sub,
        organizationId: membership.orgId,
      });

      // Log search for analytics
      await db.insert(prospectSearches).values({
        agentId: req.user.claims.sub,
        organizationId: membership.orgId,
        zipCode,
        businessTypes: selectedCodes,
        radiusMiles: radius,
        resultsCount: results.totalFound,
      });

      res.json(results);
    } catch (error: any) {
      console.error("[Prospects] Search error:", error);
      res.status(500).json({ error: "Search failed. Please try again." });
    }
  });

  // Claim a discovered business
  app.post("/api/prospects/claim", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const agentId = req.user.claims.sub;
      const { business } = req.body;

      if (!business?.name || !business?.zipCode) {
        return res.status(400).json({ error: "Business name and zip code required" });
      }

      // Check if already claimed by another agent
      const existing = await db
        .select()
        .from(prospects)
        .where(
          and(
            eq(prospects.zipCode, business.zipCode),
            ilike(prospects.businessName, business.name)
          )
        )
        .limit(1);

      if (existing.length > 0 && existing[0].agentId !== agentId) {
        return res.status(409).json({
          error: "This business has already been claimed by another agent",
          alreadyClaimed: true,
        });
      }

      if (existing.length > 0) {
        return res.json({ prospect: existing[0], alreadyClaimed: false });
      }

      // Create new prospect
      const [prospect] = await db
        .insert(prospects)
        .values({
          agentId,
          organizationId: membership.orgId,
          businessName: business.name,
          addressLine1: business.address,
          city: business.city,
          state: business.state,
          zipCode: business.zipCode,
          phone: business.phone,
          email: business.email,
          website: business.website,
          mccCode: business.mccCode,
          mccDescription: business.businessType,
          businessType: business.businessType,
          hoursOfOperation: business.hoursOfOperation,
          ownerName: business.ownerName,
          yearEstablished: business.yearEstablished,
          businessDescription: business.description,
          aiConfidenceScore: business.confidence?.toString(),
          source: "ai_search",
          status: "discovered",
        })
        .returning();

      // Log activity
      await db.insert(prospectActivities).values({
        prospectId: prospect.id,
        agentId,
        activityType: "created",
        notes: "Claimed from AI search",
      });

      res.json({ prospect, alreadyClaimed: false });
    } catch (error: any) {
      console.error("[Prospects] Claim error:", error);
      res.status(500).json({ error: "Failed to claim prospect" });
    }
  });

  // Scan business card and extract contact data using AI OCR
  app.post("/api/prospects/scan-card", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const { imageData, mimeType } = req.body;

      if (!imageData || !mimeType) {
        return res.status(400).json({ error: "Image data and mime type required" });
      }

      // Validate payload size (max 10MB base64 encoded)
      const maxSize = 10 * 1024 * 1024 * 1.37; // 10MB * base64 overhead
      if (imageData.length > maxSize) {
        return res.status(400).json({ error: "Image too large. Maximum size is 10MB." });
      }

      // Validate mime type
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(mimeType)) {
        return res.status(400).json({ error: "Invalid image type. Please use JPEG, PNG, GIF, or WebP." });
      }

      console.log("[BusinessCard] Processing card scan, mimeType:", mimeType, "dataLength:", imageData.length);

      const extractedData = await extractBusinessCardData(imageData, mimeType);

      console.log("[BusinessCard] Extraction complete, confidence:", extractedData.confidence);

      res.json({
        success: true,
        data: extractedData,
      });
    } catch (error: any) {
      console.error("[BusinessCard] Scan error:", error);
      res.status(500).json({ error: error.message || "Failed to scan business card. Please try again." });
    }
  });

  // Create prospect from business card scan
  app.post("/api/prospects/from-card", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const agentId = req.user.claims.sub;
      const { cardData } = req.body;

      if (!cardData?.businessName) {
        return res.status(400).json({ error: "Business name is required" });
      }

      // Create the prospect
      const [prospect] = await db
        .insert(prospects)
        .values({
          agentId,
          organizationId: membership.orgId,
          businessName: cardData.businessName,
          ownerName: cardData.contactName,
          addressLine1: cardData.addressLine1,
          city: cardData.city,
          state: cardData.state,
          zipCode: cardData.zipCode || "00000",
          phone: cardData.phone,
          email: cardData.email,
          website: cardData.website,
          businessType: cardData.businessType,
          aiConfidenceScore: cardData.confidence?.toString(),
          source: "business_card",
          status: "discovered",
          notes: cardData.extractionNotes?.length > 0 
            ? `Scanned from business card. Notes: ${cardData.extractionNotes.join("; ")}` 
            : "Scanned from business card",
        })
        .returning();

      // Log activity
      await db.insert(prospectActivities).values({
        prospectId: prospect.id,
        agentId,
        activityType: "created",
        notes: "Created from business card scan",
      });

      res.json({ prospect });
    } catch (error: any) {
      console.error("[Prospects] Create from card error:", error);
      res.status(500).json({ error: "Failed to create prospect from business card" });
    }
  });

  // ============================================
  // DUPLICATE DETECTION ROUTES
  // ============================================

  const duplicateDetector = getDuplicateDetector({
    duplicateThreshold: 0.75,
    potentialDuplicateThreshold: 0.6,
    phoneMatchIsDuplicate: true,
  });

  // Check for duplicates before creating a prospect
  app.post("/api/prospects/check-duplicate", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const agentId = req.user.claims.sub;
      const { businessName, phone, address, city, state, zip, website, email } = req.body;

      if (!businessName) {
        return res.status(400).json({ error: "Business name is required" });
      }

      // Get existing prospects for this agent
      const existingProspects = await db.select()
        .from(prospects)
        .where(eq(prospects.agentId, agentId));

      const newProspect: DuplicateProspect = {
        businessName,
        phone,
        address,
        city,
        state,
        zip,
        website,
        email,
      };

      const result = duplicateDetector.checkDuplicate(newProspect, existingProspects as DuplicateProspect[]);

      res.json({
        ...result,
        matches: result.matches.map(m => ({
          id: m.prospect.id,
          businessName: m.prospect.businessName,
          phone: m.prospect.phone,
          address: m.prospect.address,
          city: m.prospect.city,
          state: m.prospect.state,
          score: m.score,
          confidence: m.confidence,
          reasons: m.reasons,
          matchDetails: m.matchDetails,
        })),
      });
    } catch (error: any) {
      console.error("[Prospects] Check duplicate error:", error);
      res.status(500).json({ error: "Failed to check duplicate" });
    }
  });

  // Scan entire prospect list for duplicates
  app.post("/api/prospects/scan-duplicates", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const agentId = req.user.claims.sub;
      const { threshold } = req.body;

      const allProspects = await db.select()
        .from(prospects)
        .where(eq(prospects.agentId, agentId));

      // Create a request-specific detector to avoid race conditions with shared config
      const requestDetector = threshold && typeof threshold === 'number'
        ? new (await import('./services/duplicate-detection')).default({
            ...duplicateDetector.getConfig(),
            potentialDuplicateThreshold: threshold,
          })
        : duplicateDetector;

      const duplicates = requestDetector.findDuplicatesInList(allProspects as DuplicateProspect[]);

      // Group duplicates for easier handling
      const groups = groupDuplicatePairs(duplicates);

      res.json({
        totalProspects: allProspects.length,
        duplicatePairs: duplicates.length,
        duplicateGroups: groups.length,
        groups: groups.map(group => ({
          prospects: group.map(p => ({
            id: p.id,
            businessName: p.businessName,
            phone: p.phone,
            address: p.address,
            city: p.city,
            state: p.state,
          })),
        })),
        pairs: duplicates.slice(0, 50).map(d => ({
          prospect1: {
            id: d.prospect1.id,
            businessName: d.prospect1.businessName,
            phone: d.prospect1.phone,
          },
          prospect2: {
            id: d.prospect2.id,
            businessName: d.prospect2.businessName,
            phone: d.prospect2.phone,
          },
          score: d.score,
          reasons: d.reasons,
        })),
      });
    } catch (error: any) {
      console.error("[Prospects] Scan duplicates error:", error);
      res.status(500).json({ error: "Failed to scan duplicates" });
    }
  });

  // Merge duplicate prospects
  app.post("/api/prospects/merge", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const agentId = req.user.claims.sub;
      const { keepId, mergeIds } = req.body;

      if (!keepId || !mergeIds || !Array.isArray(mergeIds)) {
        return res.status(400).json({ error: "keepId and mergeIds array are required" });
      }

      // Verify ownership of the prospect to keep
      const prospectToKeep = await db.select()
        .from(prospects)
        .where(and(
          eq(prospects.id, keepId),
          eq(prospects.agentId, agentId)
        ))
        .limit(1);

      if (prospectToKeep.length === 0) {
        return res.status(404).json({ error: "Prospect to keep not found" });
      }

      // Get prospects to merge
      const prospectsToMerge = await db.select()
        .from(prospects)
        .where(and(
          eq(prospects.agentId, agentId),
          or(...mergeIds.map((id: number) => eq(prospects.id, id)))
        ));

      // Merge data - fill in missing fields from merged prospects
      const kept = prospectToKeep[0];
      const updates: Record<string, any> = {};

      for (const merge of prospectsToMerge) {
        if (!kept.phone && merge.phone) updates.phone = merge.phone;
        if (!kept.email && merge.email) updates.email = merge.email;
        if (!kept.website && merge.website) updates.website = merge.website;
        if (!kept.addressLine1 && merge.addressLine1) {
          updates.addressLine1 = merge.addressLine1;
          updates.city = merge.city;
          updates.state = merge.state;
          updates.zipCode = merge.zipCode;
        }
        // Add notes about merge
        const existingNotes = kept.notes || '';
        const mergeNote = `Merged from: ${merge.businessName} (ID: ${merge.id})`;
        updates.notes = [existingNotes, mergeNote].filter(Boolean).join('\n');
      }

      // Update the kept prospect
      if (Object.keys(updates).length > 0) {
        await db.update(prospects)
          .set(updates)
          .where(eq(prospects.id, keepId));
      }

      // Delete merged prospects
      for (const id of mergeIds) {
        await db.delete(prospects)
          .where(and(
            eq(prospects.id, id),
            eq(prospects.agentId, agentId)
          ));
      }

      res.json({
        success: true,
        keptId: keepId,
        mergedCount: mergeIds.length,
        fieldsUpdated: Object.keys(updates),
      });
    } catch (error: any) {
      console.error("[Prospects] Merge error:", error);
      res.status(500).json({ error: "Failed to merge prospects" });
    }
  });

  // Get duplicate detection configuration
  app.get("/api/prospects/duplicate-config", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const config = duplicateDetector.getConfig();

      res.json({
        config,
        thresholdExplanation: {
          duplicateThreshold: "Score at or above this is considered a definite duplicate",
          potentialDuplicateThreshold: "Score at or above this triggers a warning",
        },
        weightExplanation: {
          nameWeight: "How much business name similarity matters",
          phoneWeight: "How much phone number match matters",
          addressWeight: "How much address similarity matters",
          domainWeight: "How much website/email domain match matters",
        },
      });
    } catch (error: any) {
      console.error("[Prospects] Get duplicate config error:", error);
      res.status(500).json({ error: "Failed to get duplicate config" });
    }
  });

  // Update duplicate detection configuration (admin only)
  app.put("/api/prospects/duplicate-config", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      
      // Only master_admin can update config
      if (membership.role !== "master_admin") {
        return res.status(403).json({ error: "Only admins can update duplicate detection config" });
      }

      const updates = req.body;
      const allowedKeys = [
        "duplicateThreshold",
        "potentialDuplicateThreshold",
        "nameWeight",
        "phoneWeight",
        "addressWeight",
        "domainWeight",
        "minNameSimilarity",
        "phoneMatchIsDuplicate",
      ];

      const validUpdates: Record<string, any> = {};

      for (const [key, value] of Object.entries(updates)) {
        if (allowedKeys.includes(key)) {
          if (typeof value === "number" && value >= 0 && value <= 1) {
            validUpdates[key] = value;
          } else if (typeof value === "boolean") {
            validUpdates[key] = value;
          }
        }
      }

      if (Object.keys(validUpdates).length === 0) {
        return res.status(400).json({ error: "No valid configuration updates" });
      }

      duplicateDetector.updateConfig(validUpdates);

      res.json({
        success: true,
        updated: validUpdates,
        newConfig: duplicateDetector.getConfig(),
      });
    } catch (error: any) {
      console.error("[Prospects] Update duplicate config error:", error);
      res.status(500).json({ error: "Failed to update duplicate config" });
    }
  });

  // Helper function to group duplicate pairs into clusters
  function groupDuplicatePairs(
    pairs: Array<{ prospect1: DuplicateProspect; prospect2: DuplicateProspect; score: number }>
  ): DuplicateProspect[][] {
    const groups: Map<number, Set<number>> = new Map();

    function findGroup(groups: Map<number, Set<number>>, id: number): number | null {
      for (const [groupId, members] of groups) {
        if (members.has(id)) return groupId;
      }
      return null;
    }

    for (const pair of pairs) {
      const id1 = pair.prospect1.id!;
      const id2 = pair.prospect2.id!;

      const group1 = findGroup(groups, id1);
      const group2 = findGroup(groups, id2);

      if (group1 && group2) {
        if (group1 !== group2) {
          for (const id of groups.get(group2)!) {
            groups.get(group1)!.add(id);
          }
          groups.delete(group2);
        }
      } else if (group1) {
        groups.get(group1)!.add(id2);
      } else if (group2) {
        groups.get(group2)!.add(id1);
      } else {
        groups.set(id1, new Set([id1, id2]));
      }
    }

    const prospectMap = new Map<number, DuplicateProspect>();
    for (const pair of pairs) {
      if (pair.prospect1.id) prospectMap.set(pair.prospect1.id, pair.prospect1);
      if (pair.prospect2.id) prospectMap.set(pair.prospect2.id, pair.prospect2);
    }

    return Array.from(groups.values()).map(idSet =>
      Array.from(idSet).map(id => prospectMap.get(id)!).filter(Boolean)
    );
  }

  // Get agent's prospects with filtering
  app.get("/api/prospects", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const agentId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const { status, mccCode, sortBy = "created_at", sortOrder = "desc", page = 1, limit = 50 } = req.query;

      const conditions = [eq(prospects.agentId, agentId)];
      
      if (status && typeof status === "string") {
        conditions.push(eq(prospects.status, status));
      }
      if (mccCode && typeof mccCode === "string") {
        conditions.push(eq(prospects.mccCode, mccCode));
      }

      const query = db
        .select()
        .from(prospects)
        .where(and(...conditions));

      const offset = (Number(page) - 1) * Number(limit);
      
      const allProspects = await query
        .orderBy(sortOrder === "asc" ? prospects.createdAt : desc(prospects.createdAt))
        .limit(Number(limit))
        .offset(offset);

      // Get count
      const countResult = await db
        .select()
        .from(prospects)
        .where(eq(prospects.agentId, agentId));

      res.json({
        prospects: allProspects,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult.length,
          pages: Math.ceil(countResult.length / Number(limit)),
        },
      });
    } catch (error: any) {
      console.error("[Prospects] Get error:", error);
      res.status(500).json({ error: "Failed to fetch prospects" });
    }
  });

  // Get pipeline summary
  app.get("/api/prospects/pipeline", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const agentId = req.user.claims.sub;

      const allProspects = await db
        .select()
        .from(prospects)
        .where(eq(prospects.agentId, agentId));

      // Count by status
      const pipelineCounts = allProspects.reduce((acc: Record<string, number>, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {});

      // Get upcoming follow-ups
      const now = new Date();
      const upcomingFollowups = allProspects
        .filter((p) => p.nextFollowupDate && new Date(p.nextFollowupDate) >= now)
        .sort((a, b) => new Date(a.nextFollowupDate!).getTime() - new Date(b.nextFollowupDate!).getTime())
        .slice(0, 5);

      res.json({
        counts: {
          discovered: pipelineCounts.discovered || 0,
          contacted: pipelineCounts.contacted || 0,
          qualified: pipelineCounts.qualified || 0,
          proposal_sent: pipelineCounts.proposal_sent || 0,
          negotiating: pipelineCounts.negotiating || 0,
          won: pipelineCounts.won || 0,
          lost: pipelineCounts.lost || 0,
          disqualified: pipelineCounts.disqualified || 0,
        },
        total: allProspects.length,
        upcomingFollowups,
      });
    } catch (error: any) {
      console.error("[Prospects] Pipeline error:", error);
      res.status(500).json({ error: "Failed to fetch pipeline" });
    }
  });

  // Update prospect
  app.patch("/api/prospects/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const agentId = req.user.claims.sub;

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid prospect ID" });
      }

      // Check ownership
      const [existing] = await db
        .select()
        .from(prospects)
        .where(and(eq(prospects.id, id), eq(prospects.agentId, agentId)));

      if (!existing) {
        return res.status(404).json({ error: "Prospect not found" });
      }

      const { status, notes, nextFollowupDate, phone, email, contactAttempts } = req.body;
      const updates: any = { updatedAt: new Date() };

      if (status) updates.status = status;
      if (notes !== undefined) updates.notes = notes;
      if (nextFollowupDate) updates.nextFollowupDate = new Date(nextFollowupDate);
      if (phone !== undefined) updates.phone = phone;
      if (email !== undefined) updates.email = email;
      if (contactAttempts !== undefined) updates.contactAttempts = contactAttempts;

      const [updated] = await db
        .update(prospects)
        .set(updates)
        .where(eq(prospects.id, id))
        .returning();

      // Log activity if status changed
      if (status && status !== existing.status) {
        await db.insert(prospectActivities).values({
          prospectId: id,
          agentId,
          activityType: "status_change",
          previousValue: existing.status,
          newValue: status,
        });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("[Prospects] Update error:", error);
      res.status(500).json({ error: "Failed to update prospect" });
    }
  });

  // Convert prospect to merchant
  app.post("/api/prospects/:id/convert", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const agentId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid prospect ID" });
      }

      // Check ownership
      const [prospect] = await db
        .select()
        .from(prospects)
        .where(and(eq(prospects.id, id), eq(prospects.agentId, agentId)));

      if (!prospect) {
        return res.status(404).json({ error: "Prospect not found" });
      }

      if (prospect.convertedToMerchantId) {
        return res.status(400).json({ error: "Prospect already converted" });
      }

      // Create merchant from prospect
      const merchant = await storage.createMerchant({
        orgId: membership.organization.id,
        businessName: prospect.businessName,
        status: "prospect",
        address: prospect.addressLine1 || undefined,
        businessPhone: prospect.phone || undefined,
        email: prospect.email || undefined,
        businessType: prospect.businessType || undefined,
        notes: prospect.notes || undefined,
        createdBy: agentId,
      });

      // Update prospect
      await db
        .update(prospects)
        .set({
          convertedToMerchantId: merchant.id,
          convertedAt: new Date(),
          status: "won",
          updatedAt: new Date(),
        })
        .where(eq(prospects.id, id));

      // Log activity
      await db.insert(prospectActivities).values({
        prospectId: id,
        agentId,
        activityType: "converted",
        newValue: merchant.id.toString(),
        notes: "Converted to merchant record",
      });

      res.json({ merchant, prospect: { ...prospect, convertedToMerchantId: merchant.id } });
    } catch (error: any) {
      console.error("[Prospects] Convert error:", error);
      res.status(500).json({ error: "Failed to convert prospect" });
    }
  });

  // Delete/Release prospect
  app.delete("/api/prospects/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const agentId = req.user.claims.sub;

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid prospect ID" });
      }

      // Check ownership
      const [existing] = await db
        .select()
        .from(prospects)
        .where(and(eq(prospects.id, id), eq(prospects.agentId, agentId)));

      if (!existing) {
        return res.status(404).json({ error: "Prospect not found" });
      }

      await db.delete(prospects).where(eq(prospects.id, id));

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Prospects] Delete error:", error);
      res.status(500).json({ error: "Failed to delete prospect" });
    }
  });

  // Get prospect activities
  app.get("/api/prospects/:id/activities", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid prospect ID" });
      }

      const activities = await db
        .select()
        .from(prospectActivities)
        .where(eq(prospectActivities.prospectId, id))
        .orderBy(desc(prospectActivities.createdAt));

      res.json(activities);
    } catch (error: any) {
      console.error("[Prospects] Activities error:", error);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // ==========================================
  // DEAL PIPELINE ROUTES
  // ==========================================

  // GET /api/deals/paginated - Paginated deal list with cursor-based pagination
  app.get("/api/deals/paginated", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      const membership = await getEffectiveMembership(req) || req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;
      
      const params: DealPaginationParams = normalizeDealParams({
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        cursor: req.query.cursor as string,
        sortBy: (req.query.sortBy as string) || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
        stage: req.query.stage as string,
        status: req.query.status as string,
        search: req.query.search as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        minValue: req.query.minValue ? parseFloat(req.query.minValue as string) : undefined,
        maxValue: req.query.maxValue ? parseFloat(req.query.maxValue as string) : undefined,
        temperature: req.query.temperature as string,
        priority: req.query.priority as string,
      });
      
      // Build filter conditions
      const conditions: any[] = [
        eq(deals.organizationId, orgId),
        eq(deals.archived, false)
      ];
      
      // Non-admin users only see their own deals
      if (role !== "master_admin" && role !== "relationship_manager") {
        conditions.push(eq(deals.assignedAgentId, userId));
      }
      
      if (params.stage) {
        conditions.push(eq(deals.currentStage, params.stage));
      }
      
      if (params.temperature) {
        conditions.push(eq(deals.temperature, params.temperature));
      }
      
      if (params.search) {
        conditions.push(
          or(
            ilike(deals.businessName, `%${params.search}%`),
            ilike(deals.contactName, `%${params.search}%`)
          )
        );
      }
      
      if (params.dateFrom) {
        conditions.push(gte(deals.createdAt, new Date(params.dateFrom)));
      }
      
      if (params.dateTo) {
        conditions.push(lte(deals.createdAt, new Date(params.dateTo)));
      }
      
      if (params.minValue !== undefined) {
        conditions.push(sql`CAST(${deals.estimatedMonthlyVolume} AS NUMERIC) >= ${params.minValue}`);
      }
      
      if (params.maxValue !== undefined) {
        conditions.push(sql`CAST(${deals.estimatedMonthlyVolume} AS NUMERIC) <= ${params.maxValue}`);
      }
      
      // Determine sort column
      const sortColumnMap: Record<string, any> = {
        createdAt: deals.createdAt,
        updatedAt: deals.updatedAt,
        estimatedMonthlyVolume: deals.estimatedMonthlyVolume,
        businessName: deals.businessName,
        stage: deals.currentStage,
        dealProbability: deals.dealProbability,
      };
      
      const sortColumn = sortColumnMap[params.sortBy || 'createdAt'] || deals.createdAt;
      
      // Build base query
      const baseQuery = db.select().from(deals).where(and(...conditions));
      
      // Get sort value function - maps sortBy param to actual schema field
      const getSortValue = (deal: any) => {
        const fieldMap: Record<string, string> = {
          createdAt: 'createdAt',
          updatedAt: 'updatedAt',
          estimatedMonthlyVolume: 'estimatedMonthlyVolume',
          businessName: 'businessName',
          stage: 'currentStage',
          dealProbability: 'dealProbability',
        };
        const field = fieldMap[params.sortBy || 'createdAt'] || 'createdAt';
        return deal[field];
      };
      
      // Execute paginated query
      const result = await paginate({
        query: baseQuery,
        params,
        sortColumn,
        idColumn: deals.id,
        getSortValue,
        includeTotalCount: req.query.includeCount === 'true',
        countQuery: req.query.includeCount === 'true'
          ? db.select({ count: count() }).from(deals).where(and(...conditions))
          : undefined,
      });
      
      res.json(result);
      
    } catch (error: any) {
      console.error("[Deals] Paginated list error:", error);
      res.status(500).json({ error: "Failed to fetch deals", message: error.message });
    }
  });

  // GET /api/deals/kanban - Paginated deals grouped by stage (for Kanban view)
  app.get("/api/deals/kanban", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      const membership = await getEffectiveMembership(req) || req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;
      
      const limitPerStage = req.query.limitPerStage 
        ? parseInt(req.query.limitPerStage as string) 
        : 10;
      const sortBy = (req.query.sortBy as string) || 'updatedAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const cursors = req.query.cursors 
        ? JSON.parse(req.query.cursors as string) 
        : {};
      
      const stages = PIPELINE_STAGES;
      
      // Build query for each stage
      const queryBuilder = (stage: string) => {
        const conditions: any[] = [
          eq(deals.organizationId, orgId),
          eq(deals.archived, false),
          eq(deals.currentStage, stage)
        ];
        
        if (role !== "master_admin" && role !== "relationship_manager") {
          conditions.push(eq(deals.assignedAgentId, userId));
        }
        
        return db.select().from(deals).where(and(...conditions));
      };
      
      const sortColumn = sortBy === 'updatedAt' ? deals.updatedAt : deals.createdAt;
      
      // Map sortBy param to actual schema field for getSortValue
      const sortFieldMap: Record<string, string> = {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        stage: 'currentStage',
      };
      const actualSortField = sortFieldMap[sortBy] || 'createdAt';
      
      const result = await paginateByStage(
        queryBuilder,
        [...stages],
        { limitPerStage, cursors, sortBy, sortOrder },
        sortColumn,
        deals.id,
        (deal: any) => deal[actualSortField] || deal.createdAt
      );
      
      // Get total counts per stage
      const stageCounts = await Promise.all(
        stages.map(async (stage) => {
          const conditions: any[] = [
            eq(deals.organizationId, orgId),
            eq(deals.archived, false),
            eq(deals.currentStage, stage)
          ];
          
          if (role !== "master_admin" && role !== "relationship_manager") {
            conditions.push(eq(deals.assignedAgentId, userId));
          }
          
          const [{ count: stageCount }] = await db
            .select({ count: count() })
            .from(deals)
            .where(and(...conditions));
          return { stage, count: Number(stageCount) };
        })
      );
      
      res.json({
        ...result,
        stageCounts: Object.fromEntries(
          stageCounts.map(s => [s.stage, s.count])
        ),
      });
      
    } catch (error: any) {
      console.error("[Deals] Kanban error:", error);
      res.status(500).json({ error: "Failed to fetch kanban deals", message: error.message });
    }
  });

  // GET /api/deals/stage/:stage - Paginated deals for a single stage
  app.get("/api/deals/stage/:stage", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;
      const { stage } = req.params;
      
      const params = normalizeDealParams({
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        cursor: req.query.cursor as string,
        sortBy: (req.query.sortBy as string) || 'updatedAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      });
      
      const conditions: any[] = [
        eq(deals.organizationId, orgId),
        eq(deals.archived, false),
        eq(deals.currentStage, stage)
      ];
      
      if (role !== "master_admin" && role !== "relationship_manager") {
        conditions.push(eq(deals.assignedAgentId, userId));
      }
      
      const baseQuery = db.select().from(deals).where(and(...conditions));
      
      const sortColumn = params.sortBy === 'updatedAt' ? deals.updatedAt : deals.createdAt;
      
      // Map sortBy param to actual schema field
      const sortFieldMap: Record<string, string> = {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        stage: 'currentStage',
      };
      const actualSortField = sortFieldMap[params.sortBy || 'updatedAt'] || 'updatedAt';
      
      const result = await paginate({
        query: baseQuery,
        params,
        sortColumn,
        idColumn: deals.id,
        getSortValue: (deal: any) => deal[actualSortField],
      });
      
      res.json(result);
      
    } catch (error: any) {
      console.error("[Deals] Stage deals error:", error);
      res.status(500).json({ error: "Failed to fetch stage deals", message: error.message });
    }
  });

  // GET /api/deals/search - Search deals with pagination
  app.get("/api/deals/search", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;
      const query = req.query.q as string;
      
      if (!query || query.length < 2) {
        return res.status(400).json({ error: "Search query must be at least 2 characters" });
      }
      
      const params = normalizeDealParams({
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        cursor: req.query.cursor as string,
        sortBy: 'businessName',
        sortOrder: 'asc',
      });
      
      const conditions: any[] = [
        eq(deals.organizationId, orgId),
        eq(deals.archived, false),
        or(
          ilike(deals.businessName, `%${query}%`),
          ilike(deals.contactName, `%${query}%`),
          ilike(deals.notes, `%${query}%`)
        )
      ];
      
      if (role !== "master_admin" && role !== "relationship_manager") {
        conditions.push(eq(deals.assignedAgentId, userId));
      }
      
      const baseQuery = db.select().from(deals).where(and(...conditions));
      
      const result = await paginate({
        query: baseQuery,
        params,
        sortColumn: deals.businessName,
        idColumn: deals.id,
        getSortValue: (deal: any) => deal.businessName,
      });
      
      res.json(result);
      
    } catch (error: any) {
      console.error("[Deals] Search error:", error);
      res.status(500).json({ error: "Failed to search deals", message: error.message });
    }
  });

  // GET /api/deals/stats - Get deal statistics
  app.get("/api/deals/stats", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      const membership = await getEffectiveMembership(req) || req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;
      
      const baseConditions: any[] = [
        eq(deals.organizationId, orgId),
        eq(deals.archived, false)
      ];
      
      if (role !== "master_admin" && role !== "relationship_manager") {
        baseConditions.push(eq(deals.assignedAgentId, userId));
      }
      
      // Get counts by stage
      const stageCounts = await db
        .select({
          stage: deals.currentStage,
          count: count(),
        })
        .from(deals)
        .where(and(...baseConditions))
        .groupBy(deals.currentStage);
      
      // Get total value by stage
      const stageValues = await db
        .select({
          stage: deals.currentStage,
          totalValue: sql<number>`SUM(CAST(${deals.estimatedMonthlyVolume} AS NUMERIC))`,
        })
        .from(deals)
        .where(and(...baseConditions))
        .groupBy(deals.currentStage);
      
      // Get total count
      const [{ total }] = await db
        .select({ total: count() })
        .from(deals)
        .where(and(...baseConditions));
      
      res.json({
        totalDeals: total,
        byStage: Object.fromEntries(
          stageCounts.map(s => [s.stage, {
            count: Number(s.count),
            value: Number(stageValues.find(v => v.stage === s.stage)?.totalValue || 0),
          }])
        ),
      });
      
    } catch (error: any) {
      console.error("[Deals] Stats error:", error);
      res.status(500).json({ error: "Failed to fetch deal stats", message: error.message });
    }
  });

  // GET /api/deals/today - Get today's action items (must be before /:id route)
  app.get("/api/deals/today", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      const membership = await getEffectiveMembership(req) || req.orgMembership as OrgMembershipInfo;
      const orgId = membership.organization.id;
      
      const [followUpsDue, staleDeals, checkInsDue] = await Promise.all([
        storage.getDealsNeedingFollowUp(userId),
        storage.getStaleDeals(orgId),
        storage.getDealsNeedingQuarterlyCheckin(userId),
      ]);
      
      const agentStaleDeals = staleDeals.filter(d => d.assignedAgentId === userId);
      
      res.json({
        followUpsDue,
        staleDeals: agentStaleDeals,
        checkInsDue,
      });
    } catch (error: any) {
      console.error("[Deals] Today error:", error);
      res.status(500).json({ error: "Failed to fetch today's action items" });
    }
  });

  // GET /api/deals/pipeline-counts - Get counts by stage for pipeline view
  app.get("/api/deals/pipeline-counts", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const orgId = membership.organization.id;
      
      const counts = await storage.getDealCountsByStage(orgId);
      res.json(counts);
    } catch (error: any) {
      console.error("[Deals] Pipeline counts error:", error);
      res.status(500).json({ error: "Failed to fetch pipeline counts" });
    }
  });

  // GET /api/deals/team - Get all deals with agent info (manager only)
  app.get("/api/deals/team", isAuthenticated, requireRole("master_admin", "relationship_manager"), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const orgId = membership.organization.id;
      
      const [dealsList, members] = await Promise.all([
        storage.getDealsByOrganization(orgId),
        storage.getOrganizationMembers(orgId)
      ]);
      
      const memberMap = new Map(members.map(m => [m.userId, m]));
      
      const dealsWithAgents = dealsList.map(deal => ({
        ...deal,
        agentName: memberMap.get(deal.assignedAgentId) 
          ? `${memberMap.get(deal.assignedAgentId)?.firstName || ''} ${memberMap.get(deal.assignedAgentId)?.lastName || ''}`.trim() || 'Unknown'
          : 'Unknown'
      }));
      
      res.json(dealsWithAgents);
    } catch (error: any) {
      console.error("[Deals] Team list error:", error);
      res.status(500).json({ error: "Failed to fetch team deals" });
    }
  });

  // GET /api/deals/analytics - Get pipeline analytics data (manager only)
  app.get("/api/deals/analytics", isAuthenticated, requireRole("master_admin", "relationship_manager"), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const orgId = membership.organization.id;
      
      const [dealsList, members] = await Promise.all([
        storage.getDealsByOrganization(orgId),
        storage.getOrganizationMembers(orgId)
      ]);
      
      const memberMap = new Map(members.map(m => [m.userId, m]));
      
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      
      const wonDeals = dealsList.filter(d => d.currentStage === 'sold');
      const lostDeals = dealsList.filter(d => d.currentStage === 'dead');
      const activeDeals = dealsList.filter(d => !['sold', 'dead', 'active_merchant'].includes(d.currentStage));
      
      const wonThisMonth = wonDeals.filter(d => d.wonAt && new Date(d.wonAt) >= thisMonthStart);
      const wonThisQuarter = wonDeals.filter(d => d.wonAt && new Date(d.wonAt) >= thisQuarterStart);
      
      const stageCounts: Record<string, number> = {};
      const stageTimeSum: Record<string, number> = {};
      const stageTimeCount: Record<string, number> = {};
      
      dealsList.forEach(deal => {
        stageCounts[deal.currentStage] = (stageCounts[deal.currentStage] || 0) + 1;
        
        if (deal.stageEnteredAt) {
          const timeInStage = (now.getTime() - new Date(deal.stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24);
          stageTimeSum[deal.currentStage] = (stageTimeSum[deal.currentStage] || 0) + timeInStage;
          stageTimeCount[deal.currentStage] = (stageTimeCount[deal.currentStage] || 0) + 1;
        }
      });
      
      const avgTimeByStage: Record<string, number> = {};
      Object.keys(stageTimeSum).forEach(stage => {
        avgTimeByStage[stage] = Math.round(stageTimeSum[stage] / stageTimeCount[stage] * 10) / 10;
      });
      
      const agentStats: Record<string, { name: string; won: number; lost: number; active: number; value: number }> = {};
      dealsList.forEach(deal => {
        const agentId = deal.assignedAgentId;
        if (!agentStats[agentId]) {
          const member = memberMap.get(agentId);
          agentStats[agentId] = {
            name: member ? `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
            won: 0,
            lost: 0,
            active: 0,
            value: 0
          };
        }
        if (deal.currentStage === 'sold') agentStats[agentId].won++;
        else if (deal.currentStage === 'dead') agentStats[agentId].lost++;
        else if (!['active_merchant'].includes(deal.currentStage)) agentStats[agentId].active++;
        
        if (deal.estimatedMonthlyVolume) {
          agentStats[agentId].value += parseFloat(deal.estimatedMonthlyVolume.toString());
        }
      });
      
      const topPerformers = Object.entries(agentStats)
        .sort((a, b) => b[1].won - a[1].won)
        .slice(0, 5)
        .map(([id, stats]) => ({ agentId: id, ...stats }));
      
      const totalValue = dealsList.reduce((sum, d) => {
        return sum + (d.estimatedMonthlyVolume ? parseFloat(d.estimatedMonthlyVolume.toString()) : 0);
      }, 0);
      
      const avgDealSize = wonDeals.length > 0 
        ? wonDeals.reduce((sum, d) => sum + (d.estimatedMonthlyVolume ? parseFloat(d.estimatedMonthlyVolume.toString()) : 0), 0) / wonDeals.length
        : 0;
      
      res.json({
        summary: {
          totalDeals: dealsList.length,
          activeDeals: activeDeals.length,
          wonDeals: wonDeals.length,
          lostDeals: lostDeals.length,
          wonThisMonth: wonThisMonth.length,
          wonThisQuarter: wonThisQuarter.length,
          totalPipelineValue: Math.round(totalValue),
          avgDealSize: Math.round(avgDealSize),
          winRate: wonDeals.length + lostDeals.length > 0 
            ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
            : 0
        },
        stageCounts,
        avgTimeByStage,
        topPerformers,
        agentStats: Object.entries(agentStats).map(([id, stats]) => ({ agentId: id, ...stats }))
      });
    } catch (error: any) {
      console.error("[Deals] Analytics error:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // POST /api/deals/convert-from-prospect - Convert prospect to deal
  app.post("/api/deals/convert-from-prospect", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const { prospectId } = req.body;
      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const orgId = membership.organization.id;

      if (!prospectId) {
        return res.status(400).json({ error: "prospectId is required" });
      }

      const [prospect] = await db.select().from(prospects).where(eq(prospects.id, prospectId));
      if (!prospect) {
        return res.status(404).json({ error: "Prospect not found" });
      }

      const fullAddress = [prospect.addressLine1, prospect.addressLine2, prospect.city, prospect.state, prospect.zipCode]
        .filter(Boolean)
        .join(", ");

      const dealData = {
        organizationId: orgId,
        businessName: prospect.businessName,
        businessAddress: fullAddress || undefined,
        businessCity: prospect.city || undefined,
        businessState: prospect.state || undefined,
        businessZip: prospect.zipCode || undefined,
        businessPhone: prospect.phone || undefined,
        businessEmail: prospect.email || undefined,
        website: prospect.website || undefined,
        businessType: prospect.businessType || undefined,
        mccCode: prospect.mccCode || undefined,
        contactName: prospect.ownerName || undefined,
        contactPhone: prospect.phone || undefined,
        contactEmail: prospect.email || undefined,
        assignedAgentId: userId,
        prospectId: prospect.id,
        sourceType: "prospect_finder" as const,
        currentStage: "prospect" as const,
        temperature: "warm" as const,
        createdBy: userId,
        updatedBy: userId,
        notes: prospect.notes || undefined,
      };

      const deal = await storage.createDeal(dealData);

      await db.update(prospects)
        .set({ status: "converted", updatedAt: new Date() })
        .where(eq(prospects.id, prospectId));

      await storage.createDealActivity({
        dealId: deal.id,
        organizationId: orgId,
        activityType: "deal_created",
        agentId: userId,
        description: `Deal created from prospect: ${prospect.businessName}`,
        isSystemGenerated: true,
      });

      res.status(201).json(deal);
    } catch (error: any) {
      console.error("[Deals] Convert from prospect error:", error);
      res.status(500).json({ error: "Failed to convert prospect to deal" });
    }
  });

  // GET /api/deals - Get all deals for agent (or org if RM/admin)
  app.get("/api/deals", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;
      
      let dealsList;
      if (role === "master_admin" || role === "relationship_manager") {
        dealsList = await storage.getDealsByOrganization(orgId);
      } else {
        dealsList = await storage.getDealsByAgent(userId);
      }
      
      res.json(dealsList);
    } catch (error: any) {
      console.error("[Deals] List error:", error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  // POST /api/deals - Create new deal
  app.post("/api/deals", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const orgId = membership.organization.id;

      // Sanitize numeric fields - convert empty strings to undefined
      const sanitizedBody = { ...req.body };
      const numericFields = ['estimatedMonthlyVolume', 'estimatedCommission', 'dealProbability', 'maxFollowUpAttempts', 'followUpAttemptCount'];
      for (const field of numericFields) {
        if (sanitizedBody[field] === '' || sanitizedBody[field] === null) {
          delete sanitizedBody[field];
        }
      }

      // Auto-create merchant if no merchantId provided
      let merchantId = sanitizedBody.merchantId;
      if (!merchantId) {
        // Create a merchant from deal data for unified CRM experience
        const merchantData = {
          businessName: sanitizedBody.businessName,
          businessPhone: sanitizedBody.businessPhone || null,
          email: sanitizedBody.businessEmail || null,
          address: sanitizedBody.businessAddress 
            ? `${sanitizedBody.businessAddress}${sanitizedBody.businessCity ? `, ${sanitizedBody.businessCity}` : ''}${sanitizedBody.businessState ? `, ${sanitizedBody.businessState}` : ''}${sanitizedBody.businessZip ? ` ${sanitizedBody.businessZip}` : ''}`
            : null,
          contactName: sanitizedBody.contactName || null,
          orgId: orgId,
          createdBy: userId,
          status: 'prospect',
        };
        
        const newMerchant = await storage.createMerchant(merchantData);
        merchantId = newMerchant.id;
      }

      const parsed = insertDealSchema.safeParse({
        ...sanitizedBody,
        merchantId,
        organizationId: orgId,
        assignedAgentId: sanitizedBody.assignedAgentId || userId,
        createdBy: userId,
        updatedBy: userId,
      });

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const deal = await storage.createDeal(parsed.data);

      await storage.createDealActivity({
        dealId: deal.id,
        organizationId: orgId,
        activityType: "deal_created",
        agentId: userId,
        description: `Deal created: ${deal.businessName}`,
        isSystemGenerated: true,
      });

      res.status(201).json(deal);
    } catch (error: any) {
      console.error("[Deals] Create error:", error);
      res.status(500).json({ error: "Failed to create deal" });
    }
  });

  // GET /api/deals/by-merchant/:merchantId - Get deal by merchant ID
  app.get("/api/deals/by-merchant/:merchantId", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const merchantId = parseInt(req.params.merchantId);
      if (isNaN(merchantId)) {
        return res.status(400).json({ error: "Invalid merchant ID" });
      }

      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;

      // Get all deals and filter by merchantId
      let allDeals;
      if (role === "master_admin" || role === "relationship_manager") {
        allDeals = await storage.getDealsByOrganization(orgId);
      } else {
        allDeals = await storage.getDealsByAgent(userId);
      }

      const deal = allDeals.find(d => d.merchantId === merchantId);
      
      if (!deal) {
        return res.json(null);
      }

      res.json(deal);
    } catch (error: any) {
      console.error("[Deals] Get by merchant error:", error);
      res.status(500).json({ error: "Failed to fetch deal" });
    }
  });

  // GET /api/deals/:id - Get single deal with relations
  app.get("/api/deals/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid deal ID" });
      }

      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;

      const deal = await storage.getDealWithRelations(id);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      if (deal.organizationId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (role === "agent" && deal.assignedAgentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(deal);
    } catch (error: any) {
      console.error("[Deals] Get error:", error);
      res.status(500).json({ error: "Failed to fetch deal" });
    }
  });

  // PATCH /api/deals/:id - Update deal
  app.patch("/api/deals/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid deal ID" });
      }

      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;

      const existingDeal = await storage.getDeal(id);
      if (!existingDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      if (existingDeal.organizationId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (role === "agent" && existingDeal.assignedAgentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updateData = {
        ...req.body,
        updatedBy: userId,
      };

      const deal = await storage.updateDeal(id, updateData);
      res.json(deal);
    } catch (error: any) {
      console.error("[Deals] Update error:", error);
      res.status(500).json({ error: "Failed to update deal" });
    }
  });

  // DELETE /api/deals/:id - Archive deal (soft delete)
  app.delete("/api/deals/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid deal ID" });
      }

      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;

      const existingDeal = await storage.getDeal(id);
      if (!existingDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      if (existingDeal.organizationId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Role-based delete permissions:
      // - master_admin: can delete any deal in org
      // - relationship_manager: can delete own + managed agents' deals
      // - agent: can delete own deals only
      let canDelete = false;
      
      if (role === "master_admin") {
        canDelete = true;
      } else if (role === "relationship_manager") {
        // Check if deal belongs to this manager or one of their managed agents
        if (existingDeal.assignedAgentId === userId) {
          canDelete = true;
        } else {
          // Get managed agents
          const allMembers = await storage.getOrganizationMembers(orgId);
          const rmMember = allMembers.find(m => m.userId === userId);
          if (rmMember) {
            const managedAgentIds = allMembers
              .filter(m => m.managerId === rmMember.id)
              .map(m => m.userId);
            if (existingDeal.assignedAgentId && managedAgentIds.includes(existingDeal.assignedAgentId)) {
              canDelete = true;
            }
          }
        }
      } else {
        // Agent can only delete own deals
        canDelete = existingDeal.assignedAgentId === userId;
      }
      
      if (!canDelete) {
        return res.status(403).json({ error: "You don't have permission to delete this deal" });
      }

      await storage.archiveDeal(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Deals] Delete error:", error);
      res.status(500).json({ error: "Failed to archive deal" });
    }
  });

  // PATCH /api/deals/:id/stage - Change deal stage
  app.patch("/api/deals/:id/stage", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid deal ID" });
      }

      const { stage, reason } = req.body;
      if (!stage || !PIPELINE_STAGES.includes(stage)) {
        return res.status(400).json({ error: "Invalid stage" });
      }

      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;

      const existingDeal = await storage.getDeal(id);
      if (!existingDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      if (existingDeal.organizationId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (role === "agent" && existingDeal.assignedAgentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const deal = await storage.changeDealStage(id, stage as PipelineStage, userId, reason);
      res.json(deal);
    } catch (error: any) {
      console.error("[Deals] Stage change error:", error);
      res.status(500).json({ error: "Failed to change deal stage" });
    }
  });

  // GET /api/deals/:id/activities - Get deal activities
  app.get("/api/deals/:id/activities", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid deal ID" });
      }

      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;

      const deal = await storage.getDeal(id);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      if (deal.organizationId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (role === "agent" && deal.assignedAgentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const activities = await storage.getDealActivities(id);
      res.json(activities);
    } catch (error: any) {
      console.error("[Deals] Get activities error:", error);
      res.status(500).json({ error: "Failed to fetch deal activities" });
    }
  });

  // POST /api/deals/:id/activities - Add activity
  app.post("/api/deals/:id/activities", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid deal ID" });
      }

      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;

      const deal = await storage.getDeal(id);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      if (deal.organizationId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (role === "agent" && deal.assignedAgentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const parsed = insertDealActivitySchema.safeParse({
        ...req.body,
        dealId: id,
        organizationId: orgId,
        agentId: userId,
      });

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const activity = await storage.createDealActivity(parsed.data);
      res.status(201).json(activity);
    } catch (error: any) {
      console.error("[Deals] Add activity error:", error);
      res.status(500).json({ error: "Failed to add activity" });
    }
  });

  // GET /api/deals/:id/attachments - Get deal attachments
  app.get("/api/deals/:id/attachments", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid deal ID" });
      }

      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;

      const deal = await storage.getDeal(id);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      if (deal.organizationId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (role === "agent" && deal.assignedAgentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const attachments = await storage.getDealAttachments(id);
      res.json(attachments);
    } catch (error: any) {
      console.error("[Deals] Get attachments error:", error);
      res.status(500).json({ error: "Failed to fetch deal attachments" });
    }
  });

  // POST /api/deals/:id/attachments - Add attachment
  app.post("/api/deals/:id/attachments", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid deal ID" });
      }

      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;

      const deal = await storage.getDeal(id);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      if (deal.organizationId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (role === "agent" && deal.assignedAgentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const parsed = insertDealAttachmentSchema.safeParse({
        ...req.body,
        dealId: id,
        createdBy: userId,
      });

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const attachment = await storage.createDealAttachment(parsed.data);
      res.status(201).json(attachment);
    } catch (error: any) {
      console.error("[Deals] Add attachment error:", error);
      res.status(500).json({ error: "Failed to add attachment" });
    }
  });

  // DELETE /api/deals/attachments/:id - Remove attachment
  app.delete("/api/deals/attachments/:id", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid attachment ID" });
      }

      await storage.deleteDealAttachment(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Deals] Delete attachment error:", error);
      res.status(500).json({ error: "Failed to delete attachment" });
    }
  });

  // POST /api/deals/:id/follow-up - Record follow-up attempt
  app.post("/api/deals/:id/follow-up", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid deal ID" });
      }

      const { method, outcome, notes, nextFollowUpAt } = req.body;
      if (!method || !outcome) {
        return res.status(400).json({ error: "method and outcome are required" });
      }

      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;

      const existingDeal = await storage.getDeal(id);
      if (!existingDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      if (existingDeal.organizationId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (role === "agent" && existingDeal.assignedAgentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const now = new Date();
      const newAttemptCount = (existingDeal.followUpAttemptCount || 0) + 1;

      const updateData: any = {
        followUpAttemptCount: newAttemptCount,
        lastFollowUpAt: now,
        lastFollowUpMethod: method,
        lastFollowUpOutcome: outcome,
        updatedBy: userId,
      };

      if (nextFollowUpAt) {
        updateData.nextFollowUpAt = new Date(nextFollowUpAt);
        updateData.nextFollowUpMethod = method;
      } else {
        updateData.nextFollowUpAt = null;
      }

      const deal = await storage.updateDeal(id, updateData);

      await storage.createDealActivity({
        dealId: id,
        organizationId: orgId,
        activityType: "follow_up",
        agentId: userId,
        followUpAttemptNumber: newAttemptCount,
        followUpMethod: method,
        followUpOutcome: outcome,
        notes: notes,
        description: `Follow-up #${newAttemptCount} via ${method}: ${outcome}`,
        isSystemGenerated: false,
      });

      res.json(deal);
    } catch (error: any) {
      console.error("[Deals] Follow-up error:", error);
      res.status(500).json({ error: "Failed to record follow-up" });
    }
  });

  // POST /api/deals/:id/convert-to-merchant - Convert won deal to active merchant
  app.post("/api/deals/:id/convert-to-merchant", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid deal ID" });
      }

      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;

      const existingDeal = await storage.getDeal(id);
      if (!existingDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      if (existingDeal.organizationId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (role === "agent" && existingDeal.assignedAgentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (existingDeal.currentStage !== "sold") {
        return res.status(400).json({ error: "Deal must be in 'sold' stage to convert to merchant" });
      }

      if (existingDeal.merchantId) {
        return res.status(400).json({ error: "Deal is already linked to a merchant" });
      }

      const merchant = await storage.createMerchant({
        orgId: orgId,
        businessName: existingDeal.businessName,
        businessType: existingDeal.businessType || undefined,
        businessPhone: existingDeal.businessPhone || undefined,
        contactName: existingDeal.contactName || undefined,
        email: existingDeal.businessEmail || undefined,
        address: existingDeal.businessAddress 
          ? `${existingDeal.businessAddress}${existingDeal.businessCity ? ', ' + existingDeal.businessCity : ''}${existingDeal.businessState ? ', ' + existingDeal.businessState : ''}${existingDeal.businessZip ? ' ' + existingDeal.businessZip : ''}`
          : undefined,
        latitude: existingDeal.latitude || undefined,
        longitude: existingDeal.longitude || undefined,
        status: "converted",
        notes: existingDeal.notes || undefined,
        createdBy: userId,
      });

      const now = new Date();
      const nextCheckin = new Date(now);
      nextCheckin.setDate(nextCheckin.getDate() + (existingDeal.quarterlyCheckinFrequencyDays || 90));

      const deal = await storage.updateDeal(id, {
        merchantId: merchant.id,
        currentStage: "active_merchant",
        previousStage: existingDeal.currentStage,
        stageEnteredAt: now,
        goLiveAt: now,
        lastQuarterlyCheckinAt: now,
        nextQuarterlyCheckinAt: nextCheckin,
        updatedBy: userId,
      });

      await storage.createDealActivity({
        dealId: id,
        organizationId: orgId,
        activityType: "stage_change",
        agentId: userId,
        fromStage: "sold",
        toStage: "active_merchant",
        description: `Converted to active merchant (Merchant #${merchant.id})`,
        notes: "Deal successfully converted to active merchant account",
        isSystemGenerated: false,
      });

      res.json({ deal, merchant });
    } catch (error: any) {
      console.error("[Deals] Convert to merchant error:", error);
      res.status(500).json({ error: "Failed to convert to merchant" });
    }
  });

  // POST /api/deals/:id/check-in - Record quarterly check-in
  app.post("/api/deals/:id/check-in", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid deal ID" });
      }

      const { notes, upsellOpportunities } = req.body;

      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      const role = membership.role;
      const orgId = membership.organization.id;

      const existingDeal = await storage.getDeal(id);
      if (!existingDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      if (existingDeal.organizationId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (role === "agent" && existingDeal.assignedAgentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (existingDeal.currentStage !== "active_merchant") {
        return res.status(400).json({ error: "Deal must be in 'active_merchant' stage to record check-in" });
      }

      const now = new Date();
      const nextCheckin = new Date(now);
      nextCheckin.setDate(nextCheckin.getDate() + (existingDeal.quarterlyCheckinFrequencyDays || 90));

      const existingUpsells = (existingDeal.upsellOpportunities as any[]) || [];
      const updatedUpsells = upsellOpportunities 
        ? [...existingUpsells, ...upsellOpportunities]
        : existingUpsells;

      const deal = await storage.updateDeal(id, {
        lastQuarterlyCheckinAt: now,
        nextQuarterlyCheckinAt: nextCheckin,
        upsellOpportunities: updatedUpsells.length > 0 ? updatedUpsells : undefined,
        updatedBy: userId,
      });

      await storage.createDealActivity({
        dealId: id,
        organizationId: orgId,
        activityType: "quarterly_checkin",
        agentId: userId,
        description: `Quarterly check-in completed`,
        notes: notes || "Check-in recorded",
        isSystemGenerated: false,
      });

      res.json(deal);
    } catch (error: any) {
      console.error("[Deals] Check-in error:", error);
      res.status(500).json({ error: "Failed to record check-in" });
    }
  });

  // GET /api/pipeline-config - Get pipeline stage configuration
  app.get("/api/pipeline-config", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const orgId = membership.organization.id;

      const config = await storage.getPipelineStageConfig(orgId);
      res.json(config);
    } catch (error: any) {
      console.error("[Pipeline Config] Get error:", error);
      res.status(500).json({ error: "Failed to fetch pipeline configuration" });
    }
  });

  // POST /api/pipeline-config/initialize - Initialize default pipeline config
  app.post("/api/pipeline-config/initialize", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const orgId = membership.organization.id;

      const config = await storage.initializePipelineStageConfig(orgId);
      res.json(config);
    } catch (error: any) {
      console.error("[Pipeline Config] Initialize error:", error);
      res.status(500).json({ error: "Failed to initialize pipeline configuration" });
    }
  });

  // PATCH /api/pipeline-config/:id - Update stage config
  app.patch("/api/pipeline-config/:id", isAuthenticated, requireRole("master_admin", "relationship_manager"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid config ID" });
      }

      const config = await storage.updatePipelineStageConfig(id, req.body);
      if (!config) {
        return res.status(404).json({ error: "Config not found" });
      }

      res.json(config);
    } catch (error: any) {
      console.error("[Pipeline Config] Update error:", error);
      res.status(500).json({ error: "Failed to update pipeline configuration" });
    }
  });

  // GET /api/loss-reasons - Get loss reasons
  app.get("/api/loss-reasons", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const orgId = membership.organization.id;

      const reasons = await storage.getLossReasons(orgId);
      res.json(reasons);
    } catch (error: any) {
      console.error("[Loss Reasons] Get error:", error);
      res.status(500).json({ error: "Failed to fetch loss reasons" });
    }
  });

  // POST /api/loss-reasons/initialize - Initialize default loss reasons
  app.post("/api/loss-reasons/initialize", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const orgId = membership.organization.id;

      const reasons = await storage.initializeLossReasons(orgId);
      res.json(reasons);
    } catch (error: any) {
      console.error("[Loss Reasons] Initialize error:", error);
      res.status(500).json({ error: "Failed to initialize loss reasons" });
    }
  });

  // POST /api/loss-reasons - Create loss reason
  app.post("/api/loss-reasons", isAuthenticated, requireRole("master_admin", "relationship_manager"), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const orgId = membership.organization.id;

      const reason = await storage.createLossReason({
        ...req.body,
        organizationId: orgId,
      });

      res.status(201).json(reason);
    } catch (error: any) {
      console.error("[Loss Reasons] Create error:", error);
      res.status(500).json({ error: "Failed to create loss reason" });
    }
  });

  // PATCH /api/loss-reasons/:id - Update loss reason
  app.patch("/api/loss-reasons/:id", isAuthenticated, requireRole("master_admin", "relationship_manager"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid loss reason ID" });
      }

      const reason = await storage.updateLossReason(id, req.body);
      if (!reason) {
        return res.status(404).json({ error: "Loss reason not found" });
      }

      res.json(reason);
    } catch (error: any) {
      console.error("[Loss Reasons] Update error:", error);
      res.status(500).json({ error: "Failed to update loss reason" });
    }
  });

  // DELETE /api/loss-reasons/:id - Delete loss reason
  app.delete("/api/loss-reasons/:id", isAuthenticated, requireRole("master_admin", "relationship_manager"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid loss reason ID" });
      }

      await storage.deleteLossReason(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Loss Reasons] Delete error:", error);
      res.status(500).json({ error: "Failed to delete loss reason" });
    }
  });

  // ============================================================================
  // PROSPECT FINDER BACKGROUND JOBS API
  // ============================================================================

  // POST /api/prospect-finder/jobs - Create a new background search job
  app.post("/api/prospect-finder/jobs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { location, businessTypes, businessTypesDisplay, radiusMiles, maxResults } = req.body;

      if (!location) {
        return res.status(400).json({ error: "Location (ZIP code) is required" });
      }

      // Get organization membership if available
      const membership = await storage.getUserMembership(userId);
      const orgId = membership?.organization?.id || null;

      // Create job in database with status 'pending'
      const job = await storage.createProspectSearchJob({
        agentId: userId,
        organizationId: orgId,
        zipCode: location,
        locationDisplay: location,
        businessTypes: businessTypes || [],
        businessTypesDisplay: businessTypesDisplay || "",
        radiusMiles: radiusMiles || 10,
        maxResults: maxResults || 10,
        status: "pending",
        progress: 0,
        retryCount: 0,
      });

      // Fire-and-forget: trigger background processing via internal endpoint
      const baseUrl = `http://localhost:${process.env.PORT || 5000}`;
      console.log(`[ProspectJobs] Triggering background processing for job ${job.id}`);
      fetch(`${baseUrl}/api/internal/process-prospect-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": INTERNAL_SECRET,
        },
        body: JSON.stringify({ jobId: job.id }),
      }).then(response => {
        console.log(`[ProspectJobs] Internal endpoint response: ${response.status}`);
      }).catch(err => {
        console.error("[ProspectJobs] Failed to trigger background processing:", err);
      });

      res.status(201).json({
        success: true,
        jobId: job.id,
        status: "pending",
        message: "Search started! We'll notify you when ready.",
      });
    } catch (error: any) {
      console.error("[ProspectJobs] Create job error:", error);
      res.status(500).json({ error: "Failed to create search job" });
    }
  });

  // GET /api/prospect-finder/jobs - List user's search jobs
  app.get("/api/prospect-finder/jobs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const jobs = await storage.getProspectSearchJobsByUser(userId);
      res.json({ jobs });
    } catch (error: any) {
      console.error("[ProspectJobs] List jobs error:", error);
      res.status(500).json({ error: "Failed to fetch search jobs" });
    }
  });

  // GET /api/prospect-finder/jobs/:id - Get a single job with results
  app.get("/api/prospect-finder/jobs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }

      const job = await storage.getProspectSearchJob(id);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Ensure user owns this job
      if (job.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(job);
    } catch (error: any) {
      console.error("[ProspectJobs] Get job error:", error);
      res.status(500).json({ error: "Failed to fetch search job" });
    }
  });

  // POST /api/prospect-finder/jobs/:id/retry - Retry a failed job
  app.post("/api/prospect-finder/jobs/:id/retry", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }

      const job = await storage.getProspectSearchJob(id);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Ensure user owns this job
      if (job.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Reset status to 'pending', clear error, increment retryCount
      const updatedJob = await storage.updateProspectSearchJob(id, {
        status: "pending",
        errorMessage: null,
        retryCount: (job.retryCount || 0) + 1,
        progress: 0,
      });

      // Trigger background processing again
      const baseUrl = `http://localhost:${process.env.PORT || 5000}`;
      fetch(`${baseUrl}/api/internal/process-prospect-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": INTERNAL_SECRET,
        },
        body: JSON.stringify({ jobId: id }),
      }).catch(err => {
        console.error("[ProspectJobs] Failed to trigger retry processing:", err);
      });

      res.json({
        success: true,
        jobId: id,
        status: "pending",
        message: "Retry started!",
      });
    } catch (error: any) {
      console.error("[ProspectJobs] Retry job error:", error);
      res.status(500).json({ error: "Failed to retry search job" });
    }
  });

  // DELETE /api/prospect-finder/jobs/:id - Delete a search job
  app.delete("/api/prospect-finder/jobs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }

      const job = await storage.getProspectSearchJob(id);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Ensure user owns this job
      if (job.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Delete the job
      await db.delete(prospectSearches).where(eq(prospectSearches.id, id));
      
      res.json({ success: true, message: "Job deleted" });
    } catch (error: any) {
      console.error("[ProspectJobs] Delete job error:", error);
      res.status(500).json({ error: "Failed to delete search job" });
    }
  });

  // POST /api/internal/process-prospect-job - Internal endpoint for background processing
  app.post("/api/internal/process-prospect-job", async (req, res) => {
    // Verify internal secret header
    const secret = req.headers["x-internal-secret"];
    if (secret !== INTERNAL_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: "jobId required" });
    }

    // Return immediately
    res.json({ received: true });

    // Process job asynchronously after response
    setImmediate(async () => {
      try {
        const job = await storage.getProspectSearchJob(jobId);
        if (!job) {
          console.error("[ProspectJobs] Job not found for processing:", jobId);
          return;
        }

        // Update job to 'processing'
        await storage.updateProspectSearchJob(jobId, {
          status: "processing",
          startedAt: new Date(),
        });

        console.log("[ProspectJobs] Processing job:", jobId);

        // Resolve MCC codes to actual business type names for the AI search
        const mccData = await import("./data/mcc-codes.json");
        const storedCodes = job.businessTypes || [];
        const businessTypesArray = mccData.mccCodes
          .filter((mcc: any) => storedCodes.includes(mcc.code))
          .map((mcc: any) => ({
            code: mcc.code,
            name: mcc.title,
            searchTerms: mcc.searchTerms || [mcc.title],
          }));

        // Fallback: if no MCC codes matched, use businessTypesDisplay
        if (businessTypesArray.length === 0 && job.businessTypesDisplay) {
          const displayNames = job.businessTypesDisplay.split(", ").filter(Boolean);
          for (const name of displayNames) {
            businessTypesArray.push({ code: "0000", name, searchTerms: [name] });
          }
        }

        // Run the AI search
        const searchResult = await searchLocalBusinesses({
          zipCode: job.zipCode,
          businessTypes: businessTypesArray,
          radius: job.radiusMiles || 10,
          maxResults: job.maxResults || 10,
          agentId: job.agentId,
          organizationId: job.organizationId || undefined,
        });

        // Save results and mark as completed
        await storage.updateProspectSearchJob(jobId, {
          status: "completed",
          completedAt: new Date(),
          results: searchResult.businesses,
          resultsCount: searchResult.businesses.length,
          progress: 100,
        });

        console.log("[ProspectJobs] Job completed:", jobId, "Results:", searchResult.businesses.length);

        // Try to send push notification if VAPID keys exist
        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@example.com";

        if (vapidPublicKey && vapidPrivateKey) {
          try {
            webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

            const subscriptions = await storage.getPushSubscriptionsByUser(job.agentId);
            
            const payload = JSON.stringify({
              title: "Prospect Search Complete",
              body: `Found ${searchResult.businesses.length} businesses near ${job.zipCode}`,
              data: { jobId, type: "prospect-search-complete" },
            });

            for (const sub of subscriptions) {
              try {
                await webpush.sendNotification({
                  endpoint: sub.endpoint,
                  keys: {
                    p256dh: sub.keysP256dh,
                    auth: sub.keysAuth,
                  },
                }, payload);
              } catch (pushErr: any) {
                console.error("[ProspectJobs] Push notification failed:", pushErr.message);
              }
            }

            // Mark notification as sent
            await storage.updateProspectSearchJob(jobId, {
              notificationSent: true,
              notificationSentAt: new Date(),
            });
          } catch (notifyErr: any) {
            console.error("[ProspectJobs] Failed to send notifications:", notifyErr.message);
          }
        }
      } catch (error: any) {
        console.error("[ProspectJobs] Job processing failed:", error);

        // Update job with error status
        await storage.updateProspectSearchJob(jobId, {
          status: "failed",
          errorMessage: error.message || "Unknown error occurred",
          completedAt: new Date(),
        });
      }
    });
  });

  // ============================================================================
  // STATEMENT ANALYSIS BACKGROUND JOBS API
  // ============================================================================

  // POST /api/statement-analysis/jobs - Create a new background analysis job
  app.post("/api/statement-analysis/jobs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { jobName, fileNames, fileUrls, extractedTexts, merchantType } = req.body;

      if (!extractedTexts || !Array.isArray(extractedTexts) || extractedTexts.length === 0) {
        return res.status(400).json({ error: "extractedTexts array is required" });
      }

      // Get organization membership if available
      const membership = await storage.getUserMembership(userId);
      const orgId = membership?.organization?.id || null;

      // Create job in database with status 'pending'
      const job = await storage.createStatementAnalysisJob({
        agentId: userId,
        organizationId: orgId,
        jobName: jobName || `Statement Analysis ${new Date().toLocaleDateString()}`,
        fileNames: fileNames || [],
        fileUrls: fileUrls || [],
        extractedTexts: extractedTexts,
        status: "pending",
        progress: 0,
        progressMessage: "Queued for processing",
        retryCount: 0,
      });

      // Fire-and-forget: trigger background processing via internal endpoint
      const baseUrl = `http://localhost:${process.env.PORT || 5000}`;
      fetch(`${baseUrl}/api/statement-analysis/jobs/${job.id}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": INTERNAL_SECRET,
        },
        body: JSON.stringify({ merchantType: merchantType || "retail" }),
      }).catch(err => {
        console.error("[StatementJobs] Failed to trigger background processing:", err);
      });

      res.status(201).json({
        success: true,
        jobId: job.id,
        status: "pending",
        message: "Analysis started! We'll notify you when ready.",
      });
    } catch (error: any) {
      console.error("[StatementJobs] Create job error:", error);
      res.status(500).json({ error: "Failed to create analysis job" });
    }
  });

  // GET /api/statement-analysis/jobs - List user's analysis jobs (or org-wide for managers/admins)
  app.get("/api/statement-analysis/jobs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { viewAll, agentId } = req.query;
      
      // Get user's membership and role
      const membership = await storage.getUserMembership(userId);
      const isManagerOrAdmin = membership?.role === "master_admin" || membership?.role === "relationship_manager";
      
      let jobs;
      let agentMap: Record<string, { firstName: string; lastName: string }> = {};
      
      // If viewAll=true and user is manager/admin, fetch org-wide jobs
      if (viewAll === "true" && isManagerOrAdmin && membership?.organization?.id) {
        const filterAgentId = agentId && agentId !== "all" ? (agentId as string) : undefined;
        jobs = await storage.getStatementAnalysisJobsByOrg(membership.organization.id, filterAgentId);
        
        // Build agent map for display names
        const orgMembers = await storage.getOrganizationMembers(membership.organization.id);
        for (const member of orgMembers) {
          const user = await authStorage.getUser(member.userId);
          agentMap[member.userId] = {
            firstName: user?.firstName || member.firstName || "Unknown",
            lastName: user?.lastName || member.lastName || "User"
          };
        }
        
        // Enrich jobs with agent names
        jobs = jobs.map(job => ({
          ...job,
          agentName: agentMap[job.agentId] 
            ? `${agentMap[job.agentId].firstName} ${agentMap[job.agentId].lastName}`
            : "Unknown Agent"
        }));
      } else {
        jobs = await storage.getStatementAnalysisJobsByUser(userId);
      }
      
      res.json({ jobs, isManagerOrAdmin });
    } catch (error: any) {
      console.error("[StatementJobs] List jobs error:", error);
      res.status(500).json({ error: "Failed to fetch analysis jobs" });
    }
  });

  // GET /api/statement-analysis/jobs/:id - Get a single job with results
  app.get("/api/statement-analysis/jobs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }

      const job = await storage.getStatementAnalysisJob(id);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Ensure user owns this job
      if (job.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Include validation info in response
      const response = {
        ...job,
        extractedData: (job.results as any)?.statementData || getDefaultSanitizedData(),
        confidence: job.confidence || 0,
        needsManualReview: job.needsManualReview || job.status === 'needs_review',
        reviewReasons: job.reviewReasons || [],
        validationIssues: (job.validationResult as any)?.issues || [],
      };

      res.json(response);
    } catch (error: any) {
      console.error("[StatementJobs] Get job error:", error);
      res.status(500).json({ error: "Failed to fetch analysis job" });
    }
  });

  // POST /api/statement-analysis/jobs/:id/manual-review - Submit manual review corrections
  app.post("/api/statement-analysis/jobs/:id/manual-review", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const jobId = parseInt(req.params.id);
      
      if (isNaN(jobId)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }

      const job = await storage.getStatementAnalysisJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      if (job.agentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (job.status !== 'needs_review') {
        return res.status(400).json({ error: "Job is not awaiting manual review" });
      }

      const { correctedData, userConfirmed } = req.body;
      
      // Validate the manually entered data
      const manualValidation = validateAndSanitize(correctedData);
      
      // If user explicitly confirmed, trust their input more
      const finalData = userConfirmed 
        ? { ...manualValidation.data, ...correctedData }
        : manualValidation.data;
      
      // Re-run analysis with corrected data
      const statementData: StatementData = {
        processorName: finalData.merchantInfo?.processor,
        merchantName: finalData.merchantInfo?.name,
        merchantId: finalData.merchantInfo?.mid,
        totalVolume: finalData.volumeData?.totalVolume || 0,
        totalTransactions: finalData.volumeData?.totalTransactions || 0,
        averageTicket: finalData.volumeData?.avgTicket,
        cardMix: finalData.volumeData?.cardBreakdown,
        fees: {
          totalFees: finalData.fees?.reduce((sum: number, f: any) => sum + (f.amount || 0), 0) || 0,
        },
      };
      
      const analysis = analyzeStatement(statementData);
      const talkingPoints = generateTalkingPoints(analysis);

      const results = {
        statementData,
        analysis,
        talkingPoints,
        processedAt: new Date().toISOString(),
        manuallyReviewed: true,
      };

      await storage.updateStatementAnalysisJob(jobId, {
        status: 'completed',
        completedAt: new Date(),
        results: results,
        manuallyReviewed: true,
        reviewedAt: new Date(),
        needsManualReview: false,
        progress: 100,
        progressMessage: 'Analysis complete (manually reviewed)',
      });

      res.json({ 
        success: true, 
        extractedData: finalData,
        results,
      });
    } catch (error: any) {
      console.error("[StatementJobs] Manual review error:", error);
      res.status(500).json({ error: "Failed to submit manual review" });
    }
  });

  // POST /api/statement-analysis/jobs/:id/process - Internal endpoint for background processing
  app.post("/api/statement-analysis/jobs/:id/process", async (req, res) => {
    // Verify internal secret header
    const secret = req.headers["x-internal-secret"];
    if (secret !== INTERNAL_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      return res.status(400).json({ error: "Invalid job ID" });
    }

    const { merchantType = "retail" } = req.body;

    // Return immediately
    res.json({ received: true });

    // Process job asynchronously after response
    setImmediate(async () => {
      try {
        const job = await storage.getStatementAnalysisJob(jobId);
        if (!job) {
          console.error("[StatementJobs] Job not found for processing:", jobId);
          return;
        }

        // Update job to 'processing'
        await storage.updateStatementAnalysisJob(jobId, {
          status: "processing",
          startedAt: new Date(),
          progressMessage: "Analyzing statement data...",
          progress: 10,
        });

        console.log("[StatementJobs] Processing job:", jobId);

        // Parse extracted text data to get statement information
        const extractedTexts = job.extractedTexts || [];
        const fileUrls = job.fileUrls || [];
        const fileNames = job.fileNames || [];
        
        if (extractedTexts.length === 0 && fileUrls.length === 0) {
          throw new Error("No extracted text data or files available");
        }

        await storage.updateStatementAnalysisJob(jobId, {
          progress: 30,
          progressMessage: "Parsing financial data...",
        });

        // Try to parse the extracted text as JSON (from statement extractor)
        let statementData: StatementData;
        let extractedData: any = null;
        
        // First try: Check if extractedTexts contains valid JSON with statement data
        if (extractedTexts.length > 0) {
          try {
            // Remove BOM and trim whitespace
            const firstText = extractedTexts[0].replace(/^\uFEFF/, "").trim();
            // Try to parse as JSON - if it's base64 data URL it will fail
            if (firstText.startsWith("{") || firstText.startsWith("[")) {
              const parsed = JSON.parse(firstText);
              // Handle both direct object and array format
              const candidate = Array.isArray(parsed) ? parsed[0] : parsed;
              // Verify it has meaningful statement data (not just random JSON)
              if (candidate && (candidate.totalVolume || candidate.totalTransactions || candidate.processorName || candidate.merchantName || candidate.fees)) {
                extractedData = candidate;
                console.log("[StatementJobs] Parsed JSON from extractedTexts for job:", jobId);
              }
            }
          } catch (parseError) {
            // Not valid JSON - likely base64 data URL from frontend, will try file extraction
            console.log("[StatementJobs] extractedTexts is not valid JSON for job:", jobId);
          }
        }
        
        // Second try: If no valid JSON, use file URLs to extract from Object Storage
        if (!extractedData && fileUrls.length > 0) {
          console.log("[StatementJobs] Extracting from files in Object Storage for job:", jobId);
          
          await storage.updateStatementAnalysisJob(jobId, {
            progress: 40,
            progressMessage: "Extracting data from PDF...",
          });
          
          try {
            // Build file info from job data with correct MIME types
            const files = fileUrls.map((url: string, index: number) => {
              const name = fileNames[index] || `file_${index}`;
              const lowerName = name.toLowerCase();
              let mimeType = "application/octet-stream";
              if (lowerName.endsWith(".pdf")) mimeType = "application/pdf";
              else if (lowerName.endsWith(".xlsx")) mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
              else if (lowerName.endsWith(".xls")) mimeType = "application/vnd.ms-excel";
              else if (lowerName.endsWith(".csv")) mimeType = "text/csv";
              else if (lowerName.match(/\.(jpg|jpeg)$/)) mimeType = "image/jpeg";
              else if (lowerName.endsWith(".png")) mimeType = "image/png";
              else if (lowerName.endsWith(".gif")) mimeType = "image/gif";
              return { path: url, mimeType, name };
            });
            
            extractedData = await extractStatementFromFiles(files);
            console.log("[StatementJobs] Successfully extracted data from files for job:", jobId, "confidence:", extractedData.confidence);
          } catch (extractError: any) {
            console.error("[StatementJobs] File extraction failed for job:", jobId, extractError?.message);
            throw new Error(`Failed to extract data from statement files: ${extractError?.message}`);
          }
        }
        
        // If we still don't have data, throw an error instead of using defaults
        if (!extractedData || (!extractedData.totalVolume && !extractedData.fees?.totalFees)) {
          throw new Error("Could not extract meaningful data from the statement. Please try a different file or enter data manually.");
        }
        
        statementData = {
          processorName: extractedData.processorName,
          merchantName: extractedData.merchantName,
          merchantId: extractedData.merchantId,
          statementPeriod: extractedData.statementPeriod,
          totalVolume: extractedData.totalVolume || 0,
          totalTransactions: extractedData.totalTransactions || 0,
          averageTicket: extractedData.averageTicket,
          cardMix: extractedData.cardMix,
          fees: {
            interchange: extractedData.fees?.interchange,
            assessments: extractedData.fees?.assessments,
            processorMarkup: extractedData.fees?.processorMarkup,
            monthlyFees: extractedData.fees?.monthlyFees,
            pciFees: extractedData.fees?.pciFees,
            equipmentFees: extractedData.fees?.equipmentFees,
            otherFees: extractedData.fees?.otherFees,
            totalFees: extractedData.totalFees || extractedData.fees?.totalFees || 0,
            annual: extractedData.fees?.annual,
          },
          qualificationBreakdown: extractedData.qualificationBreakdown,
          merchantType: extractedData.merchantType || merchantType,
        };

        await storage.updateStatementAnalysisJob(jobId, {
          progress: 60,
          progressMessage: "Calculating savings opportunities...",
        });

        // Run the analysis
        const analysis = analyzeStatement(statementData);
        const talkingPoints = generateTalkingPoints(analysis);

        await storage.updateStatementAnalysisJob(jobId, {
          progress: 90,
          progressMessage: "Generating results...",
        });

        // Compile full results
        const results = {
          statementData,
          analysis,
          talkingPoints,
          processedAt: new Date().toISOString(),
        };

        // Save results and mark as completed
        await storage.updateStatementAnalysisJob(jobId, {
          status: "completed",
          completedAt: new Date(),
          results: results,
          progress: 100,
          progressMessage: "Analysis complete",
        });

        console.log("[StatementJobs] Job completed:", jobId);

        // Try to send push notification if VAPID keys exist
        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@example.com";

        if (vapidPublicKey && vapidPrivateKey) {
          try {
            webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

            const subscriptions = await storage.getPushSubscriptionsByUser(job.agentId);
            
            const savingsAmount = analysis.savings.dualPricing.annualSavings > 0 
              ? `$${analysis.savings.dualPricing.annualSavings.toLocaleString()}/year potential savings`
              : "Analysis ready";
            
            const payload = JSON.stringify({
              title: "Statement Analysis Complete",
              body: savingsAmount,
              data: { jobId, type: "statement-analysis-complete" },
            });

            for (const sub of subscriptions) {
              try {
                await webpush.sendNotification({
                  endpoint: sub.endpoint,
                  keys: {
                    p256dh: sub.keysP256dh,
                    auth: sub.keysAuth,
                  },
                }, payload);
              } catch (pushErr: any) {
                console.error("[StatementJobs] Push notification failed:", pushErr.message);
              }
            }

            // Mark notification as sent
            await storage.updateStatementAnalysisJob(jobId, {
              notificationSent: true,
              notificationSentAt: new Date(),
            });
          } catch (notifyErr: any) {
            console.error("[StatementJobs] Failed to send notifications:", notifyErr.message);
          }
        }
      } catch (error: any) {
        console.error("[StatementJobs] Job processing failed:", error);

        // Update job with error status
        await storage.updateStatementAnalysisJob(jobId, {
          status: "failed",
          errorMessage: error.message || "Unknown error occurred",
          completedAt: new Date(),
          progressMessage: "Analysis failed",
        });
      }
    });
  });

  // POST /api/internal/process-proposal-parse-job - Internal endpoint for background processing
  app.post("/api/internal/process-proposal-parse-job", async (req, res) => {
    const secret = req.headers["x-internal-secret"];
    if (secret !== INTERNAL_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: "jobId required" });
    }

    res.json({ received: true });

    setImmediate(async () => {
      try {
        const { processProposalParseJob } = await import("./services/proposal-parse-service");
        await processProposalParseJob(jobId);
      } catch (error) {
        console.error("[ProposalParse] Error processing job:", jobId, error);
      }
    });
  });

  // ============================================================================
  // PUSH NOTIFICATIONS API
  // ============================================================================

  // GET /api/push/vapid-public-key - Get VAPID public key for push subscriptions
  app.get("/api/push/vapid-public-key", (_req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
  });

  // POST /api/push/subscribe - Save push subscription
  app.post("/api/push/subscribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subscription } = req.body;

      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ error: "Invalid subscription data" });
      }

      // Get organization membership if available
      const membership = await storage.getUserMembership(userId);
      const orgId = membership?.organization?.id || null;

      await storage.createPushSubscription({
        userId,
        organizationId: orgId,
        endpoint: subscription.endpoint,
        keysP256dh: subscription.keys.p256dh,
        keysAuth: subscription.keys.auth,
        userAgent: req.headers["user-agent"] || null,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Push] Subscribe error:", error);
      res.status(500).json({ error: "Failed to save push subscription" });
    }
  });

  // POST /api/push/unsubscribe - Remove push subscription
  app.post("/api/push/unsubscribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint is required" });
      }

      await storage.deletePushSubscription(userId, endpoint);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Push] Unsubscribe error:", error);
      res.status(500).json({ error: "Failed to remove push subscription" });
    }
  });

  // ============================================================================
  // EMAIL DIGEST API
  // ============================================================================

  // GET /api/email-digest/preferences - Get user's email digest preferences
  app.get("/api/email-digest/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let prefs = await storage.getEmailDigestPreferences(userId);
      
      if (!prefs) {
        return res.json({
          dailyDigestEnabled: false,
          weeklyDigestEnabled: false,
          emailAddress: '',
          timezone: 'America/New_York',
          dailySendTime: '06:00',
          weeklySendDay: 'monday',
          weeklySendTime: '06:00',
          includeAppointments: true,
          includeFollowups: true,
          includeStaleDeals: true,
          includePipelineSummary: true,
          includeRecentWins: true,
          includeAiTips: true,
          includeQuarterlyCheckins: true,
          includeNewReferrals: true,
          appointmentLookaheadDays: 1,
          staleDealThresholdDays: 7,
        });
      }
      
      res.json(prefs);
    } catch (error: any) {
      console.error('Error getting email digest preferences:', error);
      res.status(500).json({ message: 'Failed to get preferences' });
    }
  });

  // PUT /api/email-digest/preferences - Update user's preferences
  app.put("/api/email-digest/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const body = req.body;
      
      // Filter to only allowed update fields (exclude read-only fields)
      const allowedFields = [
        'dailyDigestEnabled', 'weeklyDigestEnabled', 'emailAddress', 'timezone',
        'dailySendTime', 'weeklySendDay', 'weeklySendTime',
        'includeAppointments', 'includeFollowups', 'includeStaleDeals',
        'includePipelineSummary', 'includeRecentWins', 'includeAiTips',
        'includeQuarterlyCheckins', 'includeNewReferrals',
        'appointmentLookaheadDays', 'staleDealThresholdDays', 'organizationId'
      ];
      
      const data: Record<string, any> = {};
      for (const key of allowedFields) {
        if (body[key] !== undefined) {
          data[key] = body[key];
        }
      }
      
      let prefs = await storage.getEmailDigestPreferences(userId);
      
      if (prefs) {
        prefs = await storage.updateEmailDigestPreferences(userId, data);
      } else {
        prefs = await storage.createEmailDigestPreferences({
          userId,
          emailAddress: data.emailAddress || '',
          ...data,
        });
      }
      
      res.json(prefs);
    } catch (error: any) {
      console.error('Error updating email digest preferences:', error);
      res.status(500).json({ message: 'Failed to update preferences' });
    }
  });

  // POST /api/email-digest/test - Send a test digest email
  app.post("/api/email-digest/test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { digestType = 'daily' } = req.body;
      
      const prefs = await storage.getEmailDigestPreferences(userId);
      if (!prefs || !prefs.emailAddress) {
        return res.status(400).json({ message: 'Please set your email address first' });
      }
      
      const { gatherDigestData, generateDigestContent, sendDigestEmail } = await import("./services/email-digest");
      
      const data = await gatherDigestData(userId, prefs.timezone, {
        includeAppointments: prefs.includeAppointments,
        includeFollowups: prefs.includeFollowups,
        includeStaleDeals: prefs.includeStaleDeals,
        includePipelineSummary: prefs.includePipelineSummary,
        includeRecentWins: prefs.includeRecentWins,
        includeQuarterlyCheckins: prefs.includeQuarterlyCheckins,
        includeNewReferrals: prefs.includeNewReferrals,
        appointmentLookaheadDays: prefs.appointmentLookaheadDays,
        staleDealThresholdDays: prefs.staleDealThresholdDays,
      }, digestType);
      
      const userName = (req.user.claims as any).first_name || 'Sales Rep';
      const digest = await generateDigestContent(data, userName, digestType, prefs.includeAiTips);
      
      const appUrl = process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      
      const result = await sendDigestEmail(prefs.emailAddress, digest, appUrl);
      
      if (result.success) {
        await storage.createEmailDigestHistory({
          userId,
          digestType,
          appointmentsCount: data.appointments.length,
          followupsCount: data.followups.length,
          staleDealsCount: data.staleDeals.length,
          pipelineValue: data.pipelineSummary.totalValue,
          status: 'sent',
          sentAt: new Date(),
          subjectLine: digest.subject,
          emailProviderId: result.messageId,
        });
        
        res.json({ success: true, message: 'Test email sent!' });
      } else {
        await storage.createEmailDigestHistory({
          userId,
          digestType,
          status: 'failed',
          errorMessage: result.error,
        });
        res.status(500).json({ success: false, message: result.error });
      }
    } catch (error: any) {
      console.error('Error sending test digest:', error);
      res.status(500).json({ message: 'Failed to send test email' });
    }
  });

  // GET /api/email-digest/history - Get user's digest history
  app.get("/api/email-digest/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      const history = await storage.getEmailDigestHistory(userId, limit);
      res.json(history);
    } catch (error: any) {
      console.error('Error getting email digest history:', error);
      res.status(500).json({ message: 'Failed to get history' });
    }
  });

  // POST /api/email-digest/pause - Pause digests for a period
  app.post("/api/email-digest/pause", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { days } = req.body;
      
      if (!days || days < 1 || days > 30) {
        return res.status(400).json({ error: 'Invalid pause duration (1-30 days)' });
      }
      
      const pausedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      
      const updated = await storage.updateEmailDigestPreferences(userId, { pausedUntil } as any);
      
      if (!updated) {
        return res.status(404).json({ error: 'Preferences not found' });
      }
      
      res.json({ success: true, pausedUntil });
    } catch (error: any) {
      console.error('Error pausing digest:', error);
      res.status(500).json({ error: 'Failed to pause digest' });
    }
  });

  // POST /api/email-digest/resume - Resume paused digests
  app.post("/api/email-digest/resume", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const updated = await storage.updateEmailDigestPreferences(userId, { pausedUntil: null } as any);
      
      if (!updated) {
        return res.status(404).json({ error: 'Preferences not found' });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error resuming digest:', error);
      res.status(500).json({ error: 'Failed to resume digest' });
    }
  });

  // GET /api/email-digest/preview - Preview what digest would be sent now
  app.get("/api/email-digest/preview", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const prefs = await storage.getEmailDigestPreferences(userId);
      
      if (!prefs) {
        return res.json({
          notifications: [],
          content: null,
          message: 'No digest preferences configured',
        });
      }
      
      const { gatherDigestData, generateDigestContent } = await import('./services/email-digest');
      
      const data = await gatherDigestData(userId, prefs.timezone, {
        includeAppointments: prefs.includeAppointments,
        includeFollowups: prefs.includeFollowups,
        includeStaleDeals: prefs.includeStaleDeals,
        includePipelineSummary: prefs.includePipelineSummary,
        includeRecentWins: prefs.includeRecentWins,
        includeQuarterlyCheckins: prefs.includeQuarterlyCheckins,
        includeNewReferrals: prefs.includeNewReferrals,
        appointmentLookaheadDays: prefs.appointmentLookaheadDays,
        staleDealThresholdDays: prefs.staleDealThresholdDays,
      }, 'daily');
      
      const hasContent = data.appointments.length > 0 ||
        data.followups.length > 0 ||
        data.staleDeals.length > 0 ||
        data.recentWins.length > 0 ||
        data.pipelineSummary.totalDeals > 0;
      
      if (!hasContent) {
        return res.json({
          data: null,
          content: null,
          message: 'No pending content for digest',
        });
      }
      
      const content = await generateDigestContent(data, 'Sales Rep', 'daily', prefs.includeAiTips);
      
      res.json({
        data,
        content,
        previewHtml: `<p>Subject: ${content.subject}</p><p>${content.greeting}</p>`,
      });
    } catch (error: any) {
      console.error('Error generating digest preview:', error);
      res.status(500).json({ error: 'Failed to generate preview' });
    }
  });

  // POST /api/email-digest/send-now - Manually trigger digest for current user
  app.post("/api/email-digest/send-now", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const { triggerDigestForUser } = await import('./cron');
      const result = await triggerDigestForUser(userId);
      
      if (result.success) {
        res.json({
          success: true,
          notificationCount: result.notificationCount || 0,
          sentAt: result.sentAt,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error: any) {
      console.error('Error sending digest now:', error);
      res.status(500).json({ error: 'Failed to send digest' });
    }
  });

  // GET /api/admin/email-digest/stats - Get scheduler statistics (admin only)
  app.get("/api/admin/email-digest/stats", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      
      if (membership.role !== "master_admin") {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const { getDigestSchedulerStats } = await import('./cron');
      const stats = getDigestSchedulerStats();
      
      res.json(stats);
    } catch (error: any) {
      console.error('Error getting scheduler stats:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  // GET /api/digest/timezones - Get list of common timezones
  app.get("/api/digest/timezones", (req, res) => {
    res.json([
      { value: 'America/New_York', label: 'Eastern Time (ET)' },
      { value: 'America/Chicago', label: 'Central Time (CT)' },
      { value: 'America/Denver', label: 'Mountain Time (MT)' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
      { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
      { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
      { value: 'Europe/London', label: 'London (GMT/BST)' },
      { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
      { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
      { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
      { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
    ]);
  });

  // ============================================================================
  // MARKETING FLYER GENERATION API
  // ============================================================================

  // Personalize a static template with rep contact info
  app.post("/api/marketing/personalize", isAuthenticated, async (req: any, res) => {
    try {
      const { templateUrl, repName, repPhone, repEmail } = req.body;
      
      if (!templateUrl) {
        return res.status(400).json({ error: 'Template URL is required' });
      }
      
      if (!repName || !repPhone || !repEmail) {
        return res.status(400).json({ error: 'Contact information is required (name, phone, email)' });
      }

      const { personalizeStaticTemplate } = await import('./services/marketingGenerator');
      
      // Convert relative URL to full URL for Playwright
      const host = req.protocol + '://' + req.get('host');
      const fullTemplateUrl = templateUrl.startsWith('http') ? templateUrl : host + templateUrl;
      
      const personalizedUrl = await personalizeStaticTemplate(fullTemplateUrl, {
        name: repName,
        phone: repPhone,
        email: repEmail,
      });
      
      res.json({ 
        success: true, 
        personalizedUrl,
        message: 'Template personalized successfully'
      });
    } catch (error) {
      console.error('Error personalizing template:', error);
      res.status(500).json({ error: 'Failed to personalize template' });
    }
  });

  app.post("/api/marketing/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { prompt, industry, repName, repPhone, repEmail, businessWebsite } = req.body;
      
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({ error: 'Prompt is required' });
      }
      
      const { createGenerationJob, executeGenerationJob } = await import('./services/marketingGenerator');
      
      const jobId = await createGenerationJob({
        userId,
        prompt: prompt.trim(),
        industry: industry || undefined,
        repName: repName || undefined,
        repPhone: repPhone || undefined,
        repEmail: repEmail || undefined,
        businessWebsite: businessWebsite?.trim() || undefined,
      });
      
      executeGenerationJob(jobId).catch(err => {
        console.error('[MarketingAPI] Background job error:', err);
      });
      
      res.status(201).json({
        jobId,
        status: 'pending',
        message: 'Flyer generation started',
      });
    } catch (error) {
      console.error('Error creating marketing generation job:', error);
      res.status(500).json({ error: 'Failed to create generation job' });
    }
  });

  app.get("/api/marketing/jobs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { getUserGenerationJobs } = await import('./services/marketingGenerator');
      
      const jobs = await getUserGenerationJobs(userId);
      res.json(jobs);
    } catch (error) {
      console.error('Error fetching marketing generation jobs:', error);
      res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  });

  app.get("/api/marketing/jobs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ error: 'Invalid job ID' });
      }
      
      const userId = req.user.claims.sub;
      const { getGenerationJob } = await import('./services/marketingGenerator');
      
      const job = await getGenerationJob(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      // Enforce user scoping - only job owner or master_admin can access
      let canAccess = job.userId === userId;
      if (!canAccess) {
        const membership = await storage.getUserMembership(userId);
        if (membership?.role === 'master_admin') {
          canAccess = true;
        }
      }
      
      if (!canAccess) {
        return res.status(403).json({ error: 'Not authorized to access this job' });
      }
      
      res.json(job);
    } catch (error) {
      console.error('Error fetching marketing generation job:', error);
      res.status(500).json({ error: 'Failed to fetch job' });
    }
  });

  // Save a generated flyer to the marketing library
  app.post("/api/marketing/jobs/:id/save-to-library", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ error: 'Invalid job ID' });
      }

      const userId = req.user.claims.sub;
      const { getGenerationJob } = await import('./services/marketingGenerator');
      const { marketingTemplates, marketingRagContent, marketingGenerationJobs } = await import('@shared/schema');

      const job = await getGenerationJob(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Check if job belongs to user (or user is master_admin)
      let canAccess = job.userId === userId;
      if (!canAccess) {
        const membership = await storage.getUserMembership(userId);
        if (membership?.role === 'master_admin') {
          canAccess = true;
        }
      }

      if (!canAccess) {
        return res.status(403).json({ error: 'Not authorized to save this job' });
      }

      if (job.status !== 'completed') {
        return res.status(400).json({ error: 'Can only save completed jobs to library' });
      }

      if (!job.finalFlyerUrl) {
        return res.status(400).json({ error: 'Job has no final flyer URL' });
      }

      if (job.savedToLibrary) {
        return res.status(400).json({ error: 'This flyer has already been saved to the library' });
      }

      // Determine template name from industry
      const industryLabels: Record<string, string> = {
        liquor_stores: "Liquor Stores",
        restaurants_bars: "Restaurants & Bars",
        pizzerias: "Pizzerias",
        food_trucks: "Food Trucks",
        automotive: "Automotive",
        veterinarians: "Veterinarians",
        salons_spas: "Salons & Spas",
        rock_gravel: "Rock & Gravel",
        b2b_level23: "B2B / Level 2&3",
        pos_hotsauce: "HotSauce POS",
        merchant_cash_advance: "Cash Advance",
        general: "General",
      };
      const industryLabel = industryLabels[job.industry || 'general'] || 'Custom';
      const templateName = `${industryLabel} Custom Flyer`;
      const description = job.prompt?.substring(0, 100) || 'AI-generated custom flyer';

      // Create new template entry
      const [newTemplate] = await db.insert(marketingTemplates).values({
        name: templateName,
        description,
        industry: job.industry || 'general',
        thumbnailUrl: job.finalFlyerUrl,
        pdfUrl: null,
        isActive: true,
        sortOrder: 100,
      }).returning();

      // Extract content for RAG entries
      const generatedContent = job.generatedContent as {
        headline?: string;
        subhead?: string;
        bullets?: string[];
        ctaText?: string;
        ctaSubtext?: string;
      } | null;

      if (generatedContent) {
        const ragEntries: { templateId: number; contentType: string; content: string; industry: string | null }[] = [];

        if (generatedContent.headline) {
          ragEntries.push({
            templateId: newTemplate.id,
            contentType: 'headline',
            content: generatedContent.headline,
            industry: job.industry || null,
          });
        }

        if (generatedContent.subhead) {
          ragEntries.push({
            templateId: newTemplate.id,
            contentType: 'subhead',
            content: generatedContent.subhead,
            industry: job.industry || null,
          });
        }

        if (generatedContent.bullets && Array.isArray(generatedContent.bullets)) {
          for (const bullet of generatedContent.bullets) {
            ragEntries.push({
              templateId: newTemplate.id,
              contentType: 'bullet',
              content: bullet,
              industry: job.industry || null,
            });
          }
        }

        if (generatedContent.ctaText) {
          ragEntries.push({
            templateId: newTemplate.id,
            contentType: 'cta',
            content: generatedContent.ctaText,
            industry: job.industry || null,
          });
        }

        if (ragEntries.length > 0) {
          await db.insert(marketingRagContent).values(ragEntries);
        }
      }

      // Mark job as saved to library
      await db.update(marketingGenerationJobs)
        .set({ savedToLibrary: true })
        .where(eq(marketingGenerationJobs.id, jobId));

      res.json({
        success: true,
        templateId: newTemplate.id,
        message: 'Flyer saved to library successfully',
      });
    } catch (error) {
      console.error('Error saving flyer to library:', error);
      res.status(500).json({ error: 'Failed to save flyer to library' });
    }
  });

  // Get saved marketing templates from database
  app.get("/api/marketing/templates", isAuthenticated, async (_req: any, res) => {
    try {
      const { marketingTemplates } = await import('@shared/schema');
      
      const templates = await db.select().from(marketingTemplates).orderBy(desc(marketingTemplates.createdAt));
      
      res.json(templates);
    } catch (error) {
      console.error('Error fetching marketing templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  // Delete saved marketing template (admin only)
  app.delete("/api/marketing/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }

      const userId = req.user.claims.sub;
      
      // Only master_admin can delete templates
      const membership = await storage.getUserMembership(userId);
      if (membership?.role !== 'master_admin') {
        return res.status(403).json({ error: 'Only administrators can delete templates' });
      }

      const { marketingTemplates, marketingRagContent } = await import('@shared/schema');
      
      // Check if template exists
      const [template] = await db.select().from(marketingTemplates).where(eq(marketingTemplates.id, templateId));
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Delete associated RAG content first
      await db.delete(marketingRagContent).where(eq(marketingRagContent.templateId, templateId));
      
      // Delete the template
      await db.delete(marketingTemplates).where(eq(marketingTemplates.id, templateId));

      res.json({
        success: true,
        message: 'Template deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting marketing template:', error);
      res.status(500).json({ error: 'Failed to delete template' });
    }
  });

  // Get hidden static templates (for filtering)
  app.get("/api/marketing/hidden-templates", isAuthenticated, async (req: any, res) => {
    try {
      const { hiddenMarketingTemplates } = await import('@shared/schema');
      const hidden = await db.select().from(hiddenMarketingTemplates);
      res.json(hidden.map(h => h.staticTemplateId));
    } catch (error) {
      console.error('Error fetching hidden templates:', error);
      res.status(500).json({ error: 'Failed to fetch hidden templates' });
    }
  });

  // Hide a static template (admin only)
  app.post("/api/marketing/hide-template/:id", isAuthenticated, async (req: any, res) => {
    try {
      const staticTemplateId = parseInt(req.params.id);
      if (isNaN(staticTemplateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }

      const userId = req.user.claims.sub;
      
      // Only master_admin can hide templates
      const membership = await storage.getUserMembership(userId);
      if (membership?.role !== 'master_admin') {
        return res.status(403).json({ error: 'Only administrators can hide templates' });
      }

      const { hiddenMarketingTemplates } = await import('@shared/schema');
      
      // Check if already hidden
      const [existing] = await db.select()
        .from(hiddenMarketingTemplates)
        .where(eq(hiddenMarketingTemplates.staticTemplateId, staticTemplateId));
      
      if (existing) {
        return res.json({ success: true, message: 'Template already hidden' });
      }

      await db.insert(hiddenMarketingTemplates).values({
        staticTemplateId,
        hiddenBy: userId,
      });

      res.json({
        success: true,
        message: 'Template hidden successfully',
      });
    } catch (error) {
      console.error('Error hiding template:', error);
      res.status(500).json({ error: 'Failed to hide template' });
    }
  });

  // Unhide a static template (admin only)
  app.delete("/api/marketing/hide-template/:id", isAuthenticated, async (req: any, res) => {
    try {
      const staticTemplateId = parseInt(req.params.id);
      if (isNaN(staticTemplateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }

      const userId = req.user.claims.sub;
      
      // Only master_admin can unhide templates
      const membership = await storage.getUserMembership(userId);
      if (membership?.role !== 'master_admin') {
        return res.status(403).json({ error: 'Only administrators can manage templates' });
      }

      const { hiddenMarketingTemplates } = await import('@shared/schema');
      
      await db.delete(hiddenMarketingTemplates)
        .where(eq(hiddenMarketingTemplates.staticTemplateId, staticTemplateId));

      res.json({
        success: true,
        message: 'Template restored successfully',
      });
    } catch (error) {
      console.error('Error unhiding template:', error);
      res.status(500).json({ error: 'Failed to restore template' });
    }
  });

  // Delete marketing generation job (admin or owner only)
  app.delete("/api/marketing/jobs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ error: 'Invalid job ID' });
      }

      const userId = req.user.claims.sub;
      const { getGenerationJob, deleteGenerationJob } = await import('./services/marketingGenerator');

      const job = await getGenerationJob(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Check if user can delete (owner or master_admin)
      let canDelete = job.userId === userId;
      if (!canDelete) {
        const membership = await storage.getUserMembership(userId);
        if (membership?.role === 'master_admin') {
          canDelete = true;
        }
      }

      if (!canDelete) {
        return res.status(403).json({ error: 'Not authorized to delete this job' });
      }

      await deleteGenerationJob(jobId);

      res.json({
        success: true,
        message: 'Marketing material deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting marketing job:', error);
      res.status(500).json({ error: 'Failed to delete marketing material' });
    }
  });

  // List flyers from Google Drive folder for RAG learning
  app.get("/api/marketing/drive-flyers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (membership?.role !== 'master_admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { listFilesInFolder, listAllFilesRecursively } = await import('./services/googleDriveService');
      
      const FLYER_FOLDER_ID = '10_8f4xHULXoJF5gauoYtqQ6Qlytr9Ufl';
      
      const files = await listAllFilesRecursively(FLYER_FOLDER_ID);
      
      const supportedFormats = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      const flyerFiles = files.filter(f => supportedFormats.includes(f.mimeType));
      
      res.json({ files: flyerFiles, totalCount: flyerFiles.length });
    } catch (error) {
      console.error('Error listing drive flyers:', error);
      res.status(500).json({ error: 'Failed to list flyers from Google Drive' });
    }
  });

  // Download and import a flyer from Google Drive for RAG learning
  app.post("/api/marketing/import-drive-flyer", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (membership?.role !== 'master_admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { fileId, fileName, industry } = req.body;
      
      if (!fileId || !fileName) {
        return res.status(400).json({ error: 'File ID and name required' });
      }

      const { downloadFileAsBuffer } = await import('./services/googleDriveService');
      const fs = await import('fs');
      const path = await import('path');
      
      const buffer = await downloadFileAsBuffer(fileId);
      
      const extension = fileName.split('.').pop()?.toLowerCase() || 'pdf';
      const timestamp = Date.now();
      const localFilename = `imported_${timestamp}.${extension}`;
      const outputDir = path.join(process.cwd(), 'client', 'public', 'marketing', 'rag-imports');
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const localPath = path.join(outputDir, localFilename);
      fs.writeFileSync(localPath, buffer);
      
      const publicUrl = `/marketing/rag-imports/${localFilename}`;
      
      const { marketingImportedFlyers } = await import('@shared/schema');
      
      const [imported] = await db.insert(marketingImportedFlyers).values({
        sourceType: 'drive_import',
        sourceUrl: publicUrl,
        originalFileName: fileName,
        fileType: extension,
        industry: industry || 'general',
        isProcessed: false,
        importedBy: userId,
      }).returning();
      
      console.log('[Marketing RAG] Imported flyer from Drive:', fileName);
      
      res.json({
        success: true,
        importId: imported.id,
        localUrl: publicUrl,
        message: `Imported: ${fileName}`,
      });
    } catch (error) {
      console.error('Error importing drive flyer:', error);
      res.status(500).json({ error: 'Failed to import flyer from Google Drive' });
    }
  });

  // List all imported flyers
  app.get("/api/marketing/imported-flyers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (membership?.role !== 'master_admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { marketingImportedFlyers } = await import('@shared/schema');
      const { desc } = await import('drizzle-orm');
      
      const flyers = await db.select()
        .from(marketingImportedFlyers)
        .orderBy(desc(marketingImportedFlyers.importedAt));
      
      res.json({ flyers, totalCount: flyers.length });
    } catch (error) {
      console.error('Error listing imported flyers:', error);
      res.status(500).json({ error: 'Failed to list imported flyers' });
    }
  });

  // Process an imported flyer with AI to extract content for RAG
  app.post("/api/marketing/imported-flyers/:id/process", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (membership?.role !== 'master_admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const flyerId = parseInt(req.params.id);
      if (isNaN(flyerId)) {
        return res.status(400).json({ error: 'Invalid flyer ID' });
      }

      const { marketingImportedFlyers, marketingRagContent } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [flyer] = await db.select().from(marketingImportedFlyers).where(eq(marketingImportedFlyers.id, flyerId));
      
      if (!flyer) {
        return res.status(404).json({ error: 'Imported flyer not found' });
      }

      if (flyer.isProcessed) {
        return res.json({ success: true, message: 'Already processed', extractedContent: flyer.extractedContent });
      }

      const { GoogleGenAI } = await import('@google/genai');
      const geminiApiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
      
      if (!geminiApiKey) {
        throw new Error('Gemini API not configured');
      }

      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const fs = await import('fs');
      const path = await import('path');
      
      const localPath = path.join(process.cwd(), 'client', 'public', flyer.sourceUrl);
      
      if (!fs.existsSync(localPath)) {
        throw new Error('Imported file not found on disk');
      }

      const fileBuffer = fs.readFileSync(localPath);
      const base64Data = fileBuffer.toString('base64');
      
      let mimeType = 'image/png';
      if (flyer.fileType === 'pdf') mimeType = 'application/pdf';
      else if (flyer.fileType === 'jpg' || flyer.fileType === 'jpeg') mimeType = 'image/jpeg';

      const extractionPrompt = `You are analyzing a marketing flyer for PCBancard, a payment processing company.

Extract the following information from this flyer in JSON format:
{
  "headline": "The main headline/title of the flyer",
  "subhead": "Any subheadline or supporting text",
  "bullets": ["Array of benefit bullet points or key messaging points"],
  "ctaText": "The main call-to-action text",
  "ctaSubtext": "Any supporting CTA text",
  "industry": "The target industry if identifiable (e.g., restaurant, retail, liquor_stores)",
  "colorScheme": "Description of the color scheme used",
  "layout": "Description of the overall layout/design approach",
  "effectiveTechniques": ["Array of effective marketing techniques observed"]
}

Return ONLY valid JSON, no markdown or explanation.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: base64Data } },
              { text: extractionPrompt }
            ]
          }
        ]
      });

      const rawText = response.text || '';
      const cleanedText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      let extractedContent;
      try {
        extractedContent = JSON.parse(cleanedText);
      } catch {
        extractedContent = { rawText: cleanedText, parseError: true };
      }

      await db.update(marketingImportedFlyers)
        .set({
          isProcessed: true,
          extractedContent: extractedContent as any,
          processedAt: new Date(),
        })
        .where(eq(marketingImportedFlyers.id, flyerId));

      if (!extractedContent.parseError) {
        const ragEntries = [];
        
        if (extractedContent.headline) {
          ragEntries.push({
            contentType: 'headline',
            content: extractedContent.headline,
            industry: flyer.industry || extractedContent.industry || 'general',
            metadata: { sourceFlyer: flyer.originalFileName } as any,
          });
        }
        
        if (extractedContent.subhead) {
          ragEntries.push({
            contentType: 'subhead',
            content: extractedContent.subhead,
            industry: flyer.industry || extractedContent.industry || 'general',
            metadata: { sourceFlyer: flyer.originalFileName } as any,
          });
        }
        
        if (extractedContent.bullets && Array.isArray(extractedContent.bullets)) {
          for (const bullet of extractedContent.bullets) {
            ragEntries.push({
              contentType: 'bullet',
              content: bullet,
              industry: flyer.industry || extractedContent.industry || 'general',
              metadata: { sourceFlyer: flyer.originalFileName } as any,
            });
          }
        }
        
        if (extractedContent.ctaText) {
          ragEntries.push({
            contentType: 'cta',
            content: extractedContent.ctaText,
            industry: flyer.industry || extractedContent.industry || 'general',
            metadata: { sourceFlyer: flyer.originalFileName } as any,
          });
        }

        if (ragEntries.length > 0) {
          await db.insert(marketingRagContent).values(ragEntries);
        }
      }

      console.log('[Marketing RAG] Processed flyer:', flyer.originalFileName);
      
      res.json({
        success: true,
        extractedContent,
        message: 'Flyer processed and content extracted for RAG learning',
      });
    } catch (error) {
      console.error('Error processing imported flyer:', error);
      res.status(500).json({ error: 'Failed to process imported flyer' });
    }
  });

  // Batch import all flyers from Google Drive
  app.post("/api/marketing/batch-import-drive-flyers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (membership?.role !== 'master_admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { listAllFilesRecursively, downloadFileAsBuffer } = await import('./services/googleDriveService');
      const { marketingImportedFlyers } = await import('@shared/schema');
      const fs = await import('fs');
      const path = await import('path');
      
      const FLYER_FOLDER_ID = '10_8f4xHULXoJF5gauoYtqQ6Qlytr9Ufl';
      
      const files = await listAllFilesRecursively(FLYER_FOLDER_ID);
      const supportedFormats = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      const flyerFiles = files.filter(f => supportedFormats.includes(f.mimeType));
      
      const outputDir = path.join(process.cwd(), 'client', 'public', 'marketing', 'rag-imports');
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const results = [];
      
      for (const file of flyerFiles) {
        try {
          const buffer = await downloadFileAsBuffer(file.id);
          
          const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';
          const timestamp = Date.now();
          const localFilename = `imported_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          
          const localPath = path.join(outputDir, localFilename);
          fs.writeFileSync(localPath, buffer);
          
          const publicUrl = `/marketing/rag-imports/${localFilename}`;
          
          const [imported] = await db.insert(marketingImportedFlyers).values({
            sourceType: 'drive_import',
            sourceUrl: publicUrl,
            originalFileName: file.name,
            fileType: extension,
            industry: 'general',
            isProcessed: false,
            importedBy: userId,
          }).returning();
          
          results.push({ success: true, fileName: file.name, importId: imported.id });
          
          console.log('[Marketing RAG] Batch imported:', file.name);
        } catch (fileError) {
          results.push({ success: false, fileName: file.name, error: (fileError as Error).message });
        }
      }
      
      res.json({
        success: true,
        totalFiles: flyerFiles.length,
        imported: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      });
    } catch (error) {
      console.error('Error batch importing drive flyers:', error);
      res.status(500).json({ error: 'Failed to batch import flyers' });
    }
  });

  // ============================================
  // Interactive Sales Roleplay API
  // ============================================
  
  app.post("/api/sales-roleplay/message", isAuthenticated, async (req: any, res) => {
    try {
      const { message, stageId, conversationHistory } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      if (!stageId || typeof stageId !== "number" || stageId < 1 || stageId > 3) {
        return res.status(400).json({ error: "Valid stage ID (1-3) is required" });
      }

      const trimmedMessage = message.trim();
      if (trimmedMessage.length === 0) {
        return res.status(400).json({ error: "Message cannot be empty" });
      }

      const client = getAIIntegrationsClient();

      // Build system prompt based on stage
      const stagePrompts: Record<number, string> = {
        1: `You are playing the role of a busy restaurant owner named Tony. You are skeptical but open-minded.
A sales rep has just walked in during your lunch rush. You're busy but willing to give them 30 seconds.
Your goals in this conversation:
- You want to brush them off initially but are curious about saving money
- You've never heard of "Dual Pricing" before
- You're paying about 3% in credit card fees and it bothers you
- You're open to scheduling a meeting if they seem credible and not pushy

IMPORTANT: Keep responses SHORT (1-3 sentences), like a real busy merchant would. Be realistic - interrupt, be distracted, mention customers. React naturally to what the sales rep says.`,
        
        2: `You are playing the role of a restaurant owner named Tony. The sales rep is back for a 15-minute scheduled appointment.
You're sitting down with them at a table. You're more receptive now but still have questions.
Your situation:
- You process about $40,000/month in credit cards
- Your current processor charges you about 3.2%
- You've been with your current processor for 3 years
- You're worried customers won't like seeing two prices
- You've heard of surcharging but don't understand the difference

IMPORTANT: Ask realistic questions about how Dual Pricing works. Express concern about customer reaction. You need to be convinced before giving up your processing statement. Keep responses conversational (2-4 sentences).`,
        
        3: `You are playing the role of a restaurant owner named Tony. The sales rep is presenting a custom proposal showing potential savings.
You're interested but have final objections:
- You're worried about the effort to switch
- You have concerns about your current contract (possible ETF)
- You want to know about equipment and training
- You need your partner/spouse to agree before signing

IMPORTANT: Present realistic closing objections. If the rep handles them well, gradually become more positive. Don't make it too easy - push back 2-3 times. Keep responses short (2-4 sentences).`
      };

      const systemPrompt = stagePrompts[stageId] + `

Additional context:
- You are training a new sales rep
- React authentically to good and bad sales techniques
- If they use pushy tactics, become more resistant
- If they ask good questions and listen, become more open
- Never break character or acknowledge you're an AI`;

      const chatMessages: Array<{role: "system" | "user" | "assistant", content: string}> = [
        { role: "system", content: systemPrompt }
      ];

      // Add conversation history
      if (conversationHistory && Array.isArray(conversationHistory)) {
        for (const msg of conversationHistory.slice(-10)) {
          if (msg.role === "user" || msg.role === "assistant") {
            chatMessages.push({
              role: msg.role,
              content: msg.content
            });
          }
        }
      }

      // Add current message
      chatMessages.push({ role: "user", content: trimmedMessage });

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: chatMessages,
        max_tokens: 300,
        temperature: 0.8,
      });

      const aiResponse = response.choices[0]?.message?.content || "I'm sorry, could you repeat that?";

      res.json({
        response: aiResponse,
        stageId
      });
    } catch (error) {
      console.error('Error in sales roleplay:', error);
      res.status(500).json({ error: 'Failed to process roleplay message' });
    }
  });

  // ============================================================================
  // INTERACTIVE TRAINING API ROUTES
  // ============================================================================

  // Training data for merchant personas - matches frontend data
  const TRAINING_PERSONAS: Record<string, { name: string; systemPrompt: string }> = {
    'curious-carol': { name: 'Curious Carol', systemPrompt: `You are Carol, a 45-year-old café owner. You're genuinely curious about improving your business but want to understand things fully before deciding. You ask lots of questions—not to challenge, but to learn. You're polite and engaged. You've been in business 8 years and pay about $1,200/month in processing fees on $35,000 monthly volume. You don't know your effective rate. When the rep explains things clearly, you warm up. If they're pushy or use jargon, you get confused and hesitant.` },
    'friendly-fred': { name: 'Friendly Fred', systemPrompt: `You are Fred, a 58-year-old hardware store owner. You're chatty, friendly, and love to tell stories. You'll go off on tangents about your fishing trips or your grandkids. You've been with the same processor for 15 years but aren't particularly loyal—just never thought about switching. You process about $50,000/month. If the rep lets you talk and seems genuinely interested, you'll listen to what they have to say. If they cut you off or seem impatient, you lose interest.` },
    'skeptical-sam': { name: 'Skeptical Sam', systemPrompt: `You are Sam, a 52-year-old restaurant owner who's been pitched by 50 different processor reps. You're deeply skeptical of anyone claiming to save you money. You've been burned before—a rep promised savings and your rates went UP after 6 months. You process $80,000/month and pay about 3.2%. You'll push back hard on vague claims, but if someone is honest, specific, and acknowledges the downsides, you'll listen. You respect directness and hate BS.` },
    'busy-barbara': { name: 'Busy Barbara', systemPrompt: `You are Barbara, a 38-year-old salon owner who is ALWAYS busy. You're not rude, just genuinely swamped. You check your phone, glance at the door, and give short answers. You process about $25,000/month. If someone wastes your time with small talk, you shut down. But if they hook you in the first 30 seconds with something specific and valuable, you'll find time. You respond well to: "I'll take 90 seconds—if it's not relevant, I'll leave."` },
    'price-only-patty': { name: 'Price-Only Patty', systemPrompt: `You are Patty, a 44-year-old convenience store owner. You only care about one thing: the rate. You'll interrupt any pitch to ask "What's your rate?" You currently pay 2.9% but don't realize you're also paying $50 in monthly fees, $25 PCI fee, and other charges that bring your effective rate to 3.8%. You process $40,000/month. If someone can show you the TOTAL cost and prove your effective rate is higher than you think, you'll be shocked and interested.` },
    'comparison-shopping-carla': { name: 'Comparison Carla', systemPrompt: `You are Carla, a 35-year-old boutique owner who approaches everything analytically. You have a spreadsheet comparing 4 different processors. You process $30,000/month. You'll mention what other reps quoted you to see if this person will price-match or panic. If someone badmouths competitors, you lose trust. If someone explains WHY their approach is different (not just cheaper), you're intrigued. You respect confidence and hate desperation.` },
    'new-owner-nick': { name: 'New Owner Nick', systemPrompt: `You are Nick, a 35-year-old who just bought a sandwich shop 2 months ago. You inherited the previous owner's processing setup and have no idea what you're paying. You're overwhelmed with everything—vendors, employees, inventory. You process about $30,000/month. If someone offers to just LOOK at what you're currently paying and explain it to you—no commitment—you'd actually appreciate that. You need help understanding your business, not another sales pitch.` },
    'loyal-larry': { name: 'Loyal Larry', systemPrompt: `You are Larry, a 55-year-old auto shop owner. Loyalty is your core value. Your processor rep came to your shop opening 12 years ago. You know you're probably overpaying but you don't care—relationships matter more. You process $60,000/month. If someone attacks your processor, you defend them and shut down. But if someone says "I'm not here to badmouth anyone—I just want to show you what's possible and let you decide," you'll listen.` },
    'burned-before-ben': { name: 'Burned Ben', systemPrompt: `You are Ben, a 48-year-old pizza shop owner who got BURNED. Three years ago, a processor promised 1.9% and within 6 months raised it to 3.5% with hidden fees. You process $45,000/month and you're still angry about it. You assume every rep is a liar. If someone acknowledges that the industry has problems and offers concrete protection (rate locks, written guarantees, 90-day outs), you'll crack slightly.` },
    'know-it-all-kevin': { name: 'Know-It-All Kevin', systemPrompt: `You are Kevin, a 42-year-old electronics store owner who thinks he's an expert on payment processing. You've read some articles and know terms like "interchange" and "basis points." You'll correct the rep even when you're wrong. You process $70,000/month and pay about 2.8% but think you're getting a great deal. If someone can teach you something you didn't know WITHOUT making you feel stupid, you're impressed. If they let you be wrong or seem less knowledgeable than you, you dismiss them.` },
    'silent-steve': { name: 'Silent Steve', systemPrompt: `You are Steve, a 60-year-old dry cleaner owner. You're not unfriendly—just quiet. You give one-word answers and long pauses. Most salespeople get nervous and talk too much, which annoys you. You process $20,000/month. If someone asks you a direct question and then WAITS for your answer without rushing, you'll eventually open up. If they fill every silence with more talking, you shut down completely. You respect patience.` },
    'contract-connie': { name: 'Contract Connie', systemPrompt: `You are Connie, a 40-year-old gym owner who believes she's stuck in a contract. You signed something 3 years ago and assume you're locked in. In reality, your contract auto-renewed to month-to-month 8 months ago, but you don't know that. You process $55,000/month. If someone asks to actually look at your contract/statement to check, you might be surprised. You use the contract as a shield because you don't want to deal with change, but if someone proves you're NOT locked in, you have to engage.` },
    'retiring-rita': { name: 'Retiring Rita', systemPrompt: `You are Rita, a 67-year-old florist planning to retire in 18 months. You don't want to change anything because you're "almost done." You process $20,000/month and overpay by about $200/month. If someone does the math—$200 x 18 months = $3,600—that's real money you're throwing away. Or if they mention that having better processing could increase your business value when you sell, that might interest you. You're not opposed to money—just opposed to hassle.` },
    'tech-resistant-tom': { name: 'Tech-Resistant Tom', systemPrompt: `You are Tom, a 62-year-old diner owner. You've run your business for 30 years and distrust anything new. You still use a paper ticket system. You process $35,000/month on an ancient terminal. If someone talks about "apps" or "cloud" or anything technical, you shut down. But if they explain things simply—"it's just a different terminal that does the math for you"—you might listen. You're motivated by not falling behind your competition.` },
    'family-business-frank': { name: 'Family Frank', systemPrompt: `You are Frank, a 50-year-old deli owner. Your brother-in-law Tony set up the processing 10 years ago and you've never questioned it. You deflect to Tony because you genuinely don't understand processing and don't want to make a mistake. You process $40,000/month. If someone asks "What would Tony need to see to consider this?" you might engage. Or if they say "You're the owner—you should at least know what you're paying," it might spark some pride. But directly pitching you goes nowhere.` },
    'cash-heavy-carlos': { name: 'Cash-Heavy Carlos', systemPrompt: `You are Carlos, a 45-year-old barber shop owner. Your neighborhood is cash-heavy and you prefer it that way. But 20% of your $15,000 monthly volume IS cards—about $3,000—and you're paying 3.5% on that without realizing it. If someone does the math on just your card portion and shows you're losing $100+/month unnecessarily, you might care. You don't care about total volume arguments—but wasted money on the cards you DO take? That gets your attention.` },
    'just-looking-janet': { name: 'Just-Looking Janet', systemPrompt: `You are Janet, a 47-year-old gift shop owner who has been "gathering information" about switching processors for 3 years. You're not opposed—just afraid of making the wrong choice. You process $25,000/month. You've met with 6 reps and gotten quotes from all of them but never pulled the trigger. If someone asks "What would need to happen for this to be the right time?" you'll pause because you don't have a real answer. You respond to limited-time analysis offers or statements about costs of waiting.` },
    'aggressive-al': { name: 'Aggressive Al', systemPrompt: `You are Al, a 50-year-old bar owner and former college linebacker. You're aggressive and confrontational—not because you're mean, but because you respect strength. You've had weak salespeople crumble in front of you. You process $90,000/month. If someone gets defensive or apologetic, you lose all respect. But if someone pushes back calmly—"I'm not here to convince you of anything. I'm here to show you the numbers. What you do with them is up to you"—you'll respect that.` },
    'conspiracy-carl': { name: 'Conspiracy Carl', systemPrompt: `You are Carl, a 55-year-old pawn shop owner who trusts no one. You assume every offer has a hidden catch. You want to know exactly how the rep makes money and what's in it for them. You process $50,000/month. If someone is transparent—"Here's exactly how I get paid, here's what could go wrong, here's how we protect you"—you'll actually trust them more than someone who makes it sound perfect.` },
    'multi-location-maria': { name: 'Multi-Location Maria', systemPrompt: `You are Maria, a 48-year-old owner of 4 restaurants processing $400,000/month combined. You're sophisticated and have staff who handle operations. You won't make decisions in a casual conversation—you need formal proposals, references, and presentations your CFO can review. If someone treats you like a small merchant, you dismiss them. But if someone says "I understand this needs to go through your team—can I schedule a formal presentation?" you'll respect that.` },
    'dr-careful-claire': { name: 'Dr. Careful Claire', systemPrompt: `You are Claire, a 52-year-old dentist who runs a private practice. You process about $30,000/month in patient payments. You're extremely cautious about compliance—HIPAA, PCI, everything has to be by the book. You won't even consider a new processor unless they can demonstrate full PCI compliance documentation. If someone mentions security and compliance proactively, you're impressed. If they gloss over it, you shut down immediately. Your current processor charges 3.1% but you've never questioned it because "they handle the compliance stuff."` },
    'impatient-dr-ian': { name: 'Impatient Dr. Ian', systemPrompt: `You are Dr. Ian, a 45-year-old urgent care physician who owns two clinics. You process $120,000/month combined but you have zero time for sales meetings. Your office manager Lisa handles all vendor relationships. You'll give someone exactly 60 seconds before saying "talk to Lisa." If they ask smart questions about your practice volume or mention they can present to Lisa with a one-page summary, you might arrange it. You're paying 2.9% but Lisa negotiated that 3 years ago and hasn't looked since.` },
    'fuel-focused-felix': { name: 'Fuel-Focused Felix', systemPrompt: `You are Felix, a 48-year-old gas station owner processing $200,000/month. Your margins on fuel are razor-thin—2-3 cents per gallon. You obsess over interchange rates because every basis point matters at your volume. You know about Level 2 and Level 3 processing data. If someone can't speak intelligently about fleet cards, pay-at-the-pump optimization, or outdoor terminal certifications, you dismiss them. You're currently paying 2.1% blended but know your effective rate is higher with all the fees.` },
    'multi-pump-mike': { name: 'Multi-Pump Mike', systemPrompt: `You are Mike, a 55-year-old who owns 3 gas stations processing $600,000/month combined. You're extremely analytical and have spreadsheets for everything. You need fleet card support, Voyager/WEX integration, and consolidated reporting across locations. You've been with your processor for 8 years and they give you volume discounts. If someone can show unified reporting and better fleet rates, you'll listen. But you need a formal proposal your accountant can review—no handshake deals.` },
    'digital-dana': { name: 'Digital Dana', systemPrompt: `You are Dana, a 32-year-old who runs an online boutique on Shopify processing $50,000/month. Your biggest pain is chargebacks—you lost $3,000 last quarter to friendly fraud. You're also concerned about international transactions and currency conversion fees. If someone can address chargeback prevention and fraud tools specifically, you'll pay attention. You're currently using Stripe at 2.9% + 30 cents and think that's just "what online costs."` },
    'omni-channel-oscar': { name: 'Omni-Channel Oscar', systemPrompt: `You are Oscar, a 44-year-old who runs a sporting goods store with both physical location and online store, processing $150,000/month combined. Your biggest frustration is having two separate payment systems that don't talk to each other—in-store is one processor, online is another. You need unified reporting and inventory sync. If someone understands omni-channel challenges and can offer a single platform, you're very interested. You're paying different rates for each channel and hate the complexity.` },
    'attorney-amanda': { name: 'Attorney Amanda', systemPrompt: `You are Amanda, a 50-year-old attorney who runs a mid-size law firm. You process $80,000/month, mostly retainer payments and settlement disbursements. You're deeply concerned about trust account regulations—commingling client funds with operating funds is a serious ethical violation. You need a processor who understands IOLTA accounts and can separate trust account transactions. If someone doesn't know what an IOLTA account is, the conversation is over. You're paying 3.0% and your firm administrator thinks that's high.` },
    'cpa-craig': { name: 'CPA Craig', systemPrompt: `You are Craig, a 46-year-old CPA who runs a 12-person accounting firm. Your processing volume swings wildly—$15,000/month normally but $80,000/month during tax season (Jan-April). You're incredibly analytical and will calculate the ROI of switching processors down to the penny. If someone can show you a detailed cost comparison with seasonal projections, you'll be impressed. You're currently paying 2.7% flat but suspect tiered pricing would save you money during high-volume months.` },
    'hotelier-hannah': { name: 'Hotelier Hannah', systemPrompt: `You are Hannah, a 41-year-old who runs a 45-room boutique hotel processing $250,000/month. You need pre-authorization holds, tip adjustment, and the ability to process charges days after check-in. Your current processor doesn't handle hotel-specific needs well—guests get double-charged from auth holds, and tip adjustments sometimes fail. If someone understands hospitality-specific processing (incremental auths, delayed capture, folio adjustments), you'll take them seriously. You're paying 2.5% but the hidden costs of failed auths are costing you more.` },
    'bb-betty': { name: 'B&B Betty', systemPrompt: `You are Betty, a 62-year-old who runs a charming 6-room bed and breakfast. You process only $10,000/month and currently use Square because it was easy to set up. You're not tech-savvy but you know Square takes 2.6% + 10 cents. Your biggest complaint is the customer service—when there's a problem, you can never talk to a real person. If someone offers personal, local support and can match or beat Square's simplicity, you're interested. You value relationship over technology.` },
    'body-shop-bruce': { name: 'Body Shop Bruce', systemPrompt: `You are Bruce, a 47-year-old auto body shop owner processing $100,000/month. Most of your payments come from insurance companies and are large tickets ($2,000-$8,000). You're slow to make decisions because your wife handles the books and she needs to approve any changes. Your biggest frustration is hold times on large transactions—your processor flags anything over $5,000. If someone can offer higher transaction limits and faster funding for large tickets, you'll bring your wife into the conversation.` },
    'used-car-ursula': { name: 'Used-Car Ursula', systemPrompt: `You are Ursula, a 53-year-old used car dealer processing $300,000/month with individual transactions ranging from $5,000 to $30,000. You need payment plans, financing integration, and the ability to take large deposits without getting flagged. You've been declined by two processors because of your "high-risk" industry classification. You're aggressive in negotiations and will use your volume as leverage. If someone can handle high-ticket automotive transactions without treating you like a risk, you'll move fast. You currently pay 2.8% plus a $500/month "high-risk surcharge" you resent.` },
    'grocer-greg': { name: 'Grocer Greg', systemPrompt: `You are Greg, a 51-year-old independent grocery store owner processing $180,000/month. Speed is everything—your customers hate waiting in line and you need sub-2-second transaction times. You also need EBT/SNAP support which your current processor handles well. You're terrified of switching because if EBT goes down, you lose 30% of your daily business. If someone can guarantee EBT continuity and faster processing speeds, you'll consider it. You're paying 2.3% but have never looked at your statement closely.` },
    'organic-olivia': { name: 'Organic Olivia', systemPrompt: `You are Olivia, a 34-year-old health food store owner who cares deeply about sustainability and ethical business practices. You process $25,000/month. You chose your current processor because they advertised "green business practices" but you're not sure what that means. You'd switch to a processor that offers paperless statements, carbon-neutral operations, or donates to environmental causes. You're paying 3.2% because you chose based on values, not rates. If someone can show you that saving on processing fees means more money for your sustainability initiatives, that resonates.` },
    'franchisee-phil': { name: 'Franchisee Phil', systemPrompt: `You are Phil, a 39-year-old who owns a sub sandwich franchise location processing $60,000/month. Your corporate franchisor mandates a specific POS system but NOT a specific payment processor—however, you've always assumed you HAD to use the one corporate "recommended." You're paying 3.4% which is way above market because the corporate deal prioritizes the franchisor's kickback over your savings. If someone can show you that you have the RIGHT to choose your own processor (with compatible equipment), that's a game-changer. But you're nervous about going against corporate.` },
    'multi-unit-maya': { name: 'Multi-Unit Maya', systemPrompt: `You are Maya, a 48-year-old who owns 5 quick-service restaurant franchise locations processing $500,000/month combined. You're extremely sophisticated—you understand interchange, you know your effective rates by location, and you negotiate hard. Corporate mandates specific terminals but you've already gotten an exception for your processor choice. You want consolidated reporting, per-location analytics, and volume-based pricing. If someone comes unprepared without location-by-location analysis, you'll eat them alive. You're currently paying 2.2% and believe no one can beat it.` },
  };

  // Interactive Training Roleplay endpoint
  app.post("/api/training/roleplay", isAuthenticated, async (req: any, res) => {
    try {
      const { personaId, userMessage, history, trustScore: clientTrustScore, messageIndex } = req.body;
      const userId = req.user?.claims?.sub;

      if (!personaId || !userMessage) {
        return res.status(400).json({ error: "Missing personaId or userMessage" });
      }

      const persona = TRAINING_PERSONAS[personaId];
      if (!persona) {
        return res.status(400).json({ error: "Invalid persona ID" });
      }

      const hasGeminiIntegrations = process.env.AI_INTEGRATIONS_GEMINI_API_KEY && process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
      if (!hasGeminiIntegrations) {
        return res.status(503).json({ error: "AI service not configured" });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const genAI = new GoogleGenAI({
        apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
        httpOptions: {
          apiVersion: "",
          baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
        },
      });

      let trainingContext = '';
      try {
        trainingContext = await getTrainingKnowledgeForRoleplay(personaId);
      } catch (err) {
        console.log('[InteractiveTraining] Training context unavailable, using persona only');
      }

      const { getAdaptiveDifficulty, buildDeceptionInstructions, buildTrustAssessmentPrompt, parseTrustAssessmentResponse, saveTrustAssessment, getMoodBand, getMoodLabel } = await import("./trust-engine");

      const difficultyConfig = userId ? await getAdaptiveDifficulty(userId) : { difficulty: "normal" as const, startingTrust: 50, deceptionFrequency: 3, deceptionSophistication: "moderate" as const, patternBasedBaiting: [] };

      const deceptionInstructions = buildDeceptionInstructions(difficultyConfig);

      const systemPrompt = `${persona.systemPrompt}

You are in a roleplay training scenario with a PCBancard sales representative. Stay fully in character as ${persona.name}. 

PCBANCARD PRODUCT & SALES CONTEXT (use this to create realistic, informed responses):
${trainingContext}

${deceptionInstructions}

IMPORTANT RULES:
- Keep responses SHORT (1-4 sentences max), like a real busy merchant
- React authentically to what the rep says
- Never break character or acknowledge you're an AI
- If they use good NEPQ questioning techniques (asking about your situation, problems, consequences), become more receptive
- If they're pushy, use jargon, or pitch too hard, become more resistant
- Include realistic behaviors (checking phone, mentioning customers, being distracted)
- Raise realistic objections based on your persona and the training context
- If the rep handles an objection well using the Clarify-Discuss-Diffuse pattern, acknowledge it naturally
- The knowledge context is for YOU to use when evaluating the rep's approach - do NOT lecture or dump product info on them
- WEAVE YOUR DECEPTION TACTICS NATURALLY INTO YOUR RESPONSES`;

      const contents: Array<{role: "user" | "model", parts: [{text: string}]}> = [];
      
      if (history && Array.isArray(history)) {
        for (const msg of history.slice(-10)) {
          if (msg.role === 'user') {
            contents.push({ role: "user", parts: [{ text: msg.content }] });
          } else if (msg.role === 'merchant') {
            contents.push({ role: "model", parts: [{ text: msg.content }] });
          }
        }
      }

      contents.push({ role: "user", parts: [{ text: userMessage }] });

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 200,
          temperature: 0.8,
        }
      });

      const aiResponse = response.text || "Hmm, what was that?";

      let trustResult = null;
      const currentTrust = typeof clientTrustScore === 'number' ? Math.max(0, Math.min(100, clientTrustScore)) : difficultyConfig.startingTrust;
      const msgIdx = typeof messageIndex === 'number' ? messageIndex : 0;

      try {
        const contextMessages = (history || []).slice(-4).map((m: any) =>
          `${m.role === 'user' ? 'SALES REP' : 'MERCHANT'}: ${m.content}`
        ).join('\n');

        const assessmentPrompt = buildTrustAssessmentPrompt(
          currentTrust,
          msgIdx,
          userMessage,
          aiResponse,
          persona.name,
          contextMessages,
          difficultyConfig
        );

        const assessmentResponse = await genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: assessmentPrompt }] }],
          config: {
            maxOutputTokens: 300,
            temperature: 0.2,
          }
        });

        let assessmentText = assessmentResponse.text || '{}';
        const jsonMatch = assessmentText.match(/\{[\s\S]*\}/);
        if (jsonMatch) assessmentText = jsonMatch[0];
        trustResult = parseTrustAssessmentResponse(assessmentText, currentTrust);
      } catch (trustErr) {
        console.error('[TrustEngine] Assessment failed, using neutral:', trustErr);
        trustResult = {
          trustDelta: 0,
          newScore: currentTrust,
          moodBand: getMoodBand(currentTrust),
          deceptionDeployed: false,
          deceptionType: null,
          deceptionCaught: null,
          rationale: "Assessment unavailable",
          nextDeceptionHint: null,
        };
      }

      res.json({
        response: aiResponse,
        trust: {
          moodBand: trustResult.moodBand,
          moodLabel: getMoodLabel(trustResult.newScore),
          newScore: trustResult.newScore,
          delta: trustResult.trustDelta,
          deceptionDeployed: trustResult.deceptionDeployed,
          deceptionCaught: trustResult.deceptionCaught,
        }
      });
    } catch (error) {
      console.error('Error in training roleplay:', error);
      res.status(500).json({ error: 'Failed to process roleplay message' });
    }
  });

  // Interactive Training Coaching endpoint
  app.post("/api/training/coaching", isAuthenticated, async (req: any, res) => {
    try {
      const { personaId, messages } = req.body;

      if (!personaId || !messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Missing personaId or messages" });
      }

      const persona = TRAINING_PERSONAS[personaId];
      if (!persona) {
        return res.status(400).json({ error: "Invalid persona ID" });
      }

      const hasGeminiIntegrations = process.env.AI_INTEGRATIONS_GEMINI_API_KEY && process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
      if (!hasGeminiIntegrations) {
        return res.status(503).json({ error: "AI service not configured" });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const genAI = new GoogleGenAI({
        apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
        httpOptions: {
          apiVersion: "",
          baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
        },
      });

      const conversationText = messages.map((m: any) => 
        `${m.role === 'user' ? 'SALES REP' : 'MERCHANT'}: ${m.content}`
      ).join('\n');

      let trainingContext = '';
      try {
        trainingContext = await getTrainingKnowledgeForRoleplay(personaId);
      } catch (err) {
        console.log('[InteractiveTraining] Training context unavailable for coaching');
      }

      const coachingPrompt = `You are an expert PCBancard sales coach analyzing a roleplay training session between a sales rep and a merchant persona named "${persona.name}".

PCBANCARD SALES METHODOLOGY:
${trainingContext}

PERSONA CONTEXT: ${persona.systemPrompt}

CONVERSATION:
${conversationText}

Provide coaching feedback in the following format:

**Overall Assessment**: (1-2 sentences rating performance)

**What Worked Well**:
- (List 2-3 specific things the rep did effectively)

**Areas for Improvement**:
- (List 2-3 specific areas to work on with actionable advice)

**Recommended Approach for This Persona**:
(Brief advice on the best strategy for this specific merchant type)

Keep feedback concise, specific, and actionable. Reference actual phrases from the conversation when possible.
- Reference specific NEPQ techniques when applicable
- Note whether the rep used the Clarify-Discuss-Diffuse objection handling pattern
- Assess whether the rep created curiosity or just pitched
- Recommend specific techniques from the PCBancard training that would have been effective`;

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: coachingPrompt }] }],
        config: {
          maxOutputTokens: 600,
          temperature: 0.6,
        }
      });

      const feedback = response.text || "Unable to generate coaching feedback at this time.";

      res.json({ feedback });
    } catch (error) {
      console.error('Error in training coaching:', error);
      res.status(500).json({ error: 'Failed to generate coaching feedback' });
    }
  });

  // Interactive Training Gauntlet AI Scoring endpoint
  app.post("/api/training/gauntlet/score", isAuthenticated, async (req: any, res) => {
    try {
      const { objectionId, objectionText, userResponse, bestResponse, keyPrinciples } = req.body;

      if (!objectionText || !userResponse) {
        return res.status(400).json({ error: "Missing objection or user response" });
      }

      let trainingContext = '';
      try {
        const { getTrainingKnowledgeForGauntlet } = await import("./training-knowledge-context");
        trainingContext = await getTrainingKnowledgeForGauntlet();
      } catch (err) {
        console.log('[Gauntlet] Training context unavailable');
      }

      const scoringPrompt = `You are an expert PCBancard sales coach evaluating a trainee's response to a merchant objection.

PCBANCARD OBJECTION HANDLING METHODOLOGY:
${trainingContext}

THE OBJECTION:
"${objectionText}"

IDEAL RESPONSE APPROACH:
${bestResponse}

KEY PRINCIPLES FOR THIS OBJECTION:
${keyPrinciples?.join('\n') || 'Use NEPQ questioning and Clarify-Discuss-Diffuse pattern'}

TRAINEE'S ACTUAL RESPONSE:
"${userResponse}"

Score this response on a scale of 1-10 and evaluate on these criteria:
1. ACKNOWLEDGE (1-10): Did they acknowledge the concern without dismissing it?
2. QUESTION (1-10): Did they use a question-based approach (NEPQ style) rather than arguing?
3. REFRAME (1-10): Did they reframe the objection rather than argue against it?
4. NEXT_STEP (1-10): Did they move toward a next step or keep the conversation going?

RESPOND IN EXACTLY THIS FORMAT:
OVERALL: [number 1-10]
ACKNOWLEDGE: [number 1-10]
QUESTION: [number 1-10]
REFRAME: [number 1-10]
NEXT_STEP: [number 1-10]
FEEDBACK: [2-3 sentences of specific, actionable coaching feedback. Reference PCBancard methodology. Be encouraging but honest.]
IMPROVED: [A brief example of how to improve their response using NEPQ techniques]`;

      let aiScore: number | null = null;
      let aiFeedback: string = '';
      let aiImproved: string = '';
      let aiScores: Record<string, number> = {};

      try {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const anthropic = new Anthropic({
          baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
          apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
        });

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 400,
          messages: [{ role: 'user', content: scoringPrompt }],
        });

        const textBlock = response.content[0];
        if (textBlock.type === 'text') {
          const responseText = textBlock.text;

          const parseField = (text: string, field: string): string => {
            const match = text.match(new RegExp(`${field}:\\s*(.+)`, 'i'));
            return match ? match[1].trim() : '';
          };

          const overallStr = parseField(responseText, 'OVERALL');
          aiScore = parseInt(overallStr);
          if (isNaN(aiScore)) aiScore = null;

          aiScores = {
            acknowledge: parseInt(parseField(responseText, 'ACKNOWLEDGE')) || 5,
            question: parseInt(parseField(responseText, 'QUESTION')) || 5,
            reframe: parseInt(parseField(responseText, 'REFRAME')) || 5,
            nextStep: parseInt(parseField(responseText, 'NEXT_STEP')) || 5,
          };

          aiFeedback = parseField(responseText, 'FEEDBACK');
          aiImproved = parseField(responseText, 'IMPROVED');

          console.log('[Gauntlet] Claude scoring successful, score:', aiScore);
        }
      } catch (claudeError: any) {
        console.log('[Gauntlet] Claude unavailable, trying Gemini:', claudeError?.message);

        try {
          const hasGemini = process.env.AI_INTEGRATIONS_GEMINI_API_KEY && process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
          if (hasGemini) {
            const { GoogleGenAI } = await import("@google/genai");
            const genAI = new GoogleGenAI({
              apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
              httpOptions: {
                apiVersion: "",
                baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
              },
            });

            const geminiResponse = await genAI.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [{ role: "user", parts: [{ text: scoringPrompt }] }],
              config: { maxOutputTokens: 400, temperature: 0.3 }
            });

            const responseText = geminiResponse.text || '';

            const parseField = (text: string, field: string): string => {
              const match = text.match(new RegExp(`${field}:\\s*(.+)`, 'i'));
              return match ? match[1].trim() : '';
            };

            const overallStr = parseField(responseText, 'OVERALL');
            aiScore = parseInt(overallStr);
            if (isNaN(aiScore)) aiScore = null;

            aiScores = {
              acknowledge: parseInt(parseField(responseText, 'ACKNOWLEDGE')) || 5,
              question: parseInt(parseField(responseText, 'QUESTION')) || 5,
              reframe: parseInt(parseField(responseText, 'REFRAME')) || 5,
              nextStep: parseInt(parseField(responseText, 'NEXT_STEP')) || 5,
            };

            aiFeedback = parseField(responseText, 'FEEDBACK');
            aiImproved = parseField(responseText, 'IMPROVED');

            console.log('[Gauntlet] Gemini fallback scoring successful, score:', aiScore);
          }
        } catch (geminiError: any) {
          console.log('[Gauntlet] Gemini also unavailable:', geminiError?.message);
        }
      }

      res.json({
        aiScore,
        aiScores,
        aiFeedback,
        aiImproved,
        provider: aiScore !== null ? 'ai' : 'keyword_only'
      });
    } catch (error) {
      console.error('Error in gauntlet scoring:', error);
      res.status(500).json({ error: 'Failed to score response' });
    }
  });

  // Interactive Training Scenario AI Feedback endpoint
  app.post("/api/training/scenario/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const { scenarioTitle, scenarioSetup, question, selectedOption, allOptions, stage } = req.body;

      if (!scenarioTitle || !selectedOption) {
        return res.status(400).json({ error: "Missing scenario data" });
      }

      let trainingContext = '';
      try {
        const { getTrainingKnowledgeForRoleplay } = await import("./training-knowledge-context");
        trainingContext = await getTrainingKnowledgeForRoleplay('');
      } catch (err) {
        console.log('[ScenarioTrainer] Training context unavailable');
      }

      const hasGeminiIntegrations = process.env.AI_INTEGRATIONS_GEMINI_API_KEY && process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
      if (!hasGeminiIntegrations) {
        return res.status(503).json({ error: "AI service not configured" });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const genAI = new GoogleGenAI({
        apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
        httpOptions: {
          apiVersion: "",
          baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
        },
      });

      const optionsText = allOptions.map((opt: any, i: number) => 
        `${String.fromCharCode(65 + i)}) ${opt.text} (${opt.points} pts) - ${opt.feedback}`
      ).join('\n');

      const feedbackPrompt = `You are an expert PCBancard sales coach. A sales trainee just completed a scenario exercise.

PCBANCARD SALES METHODOLOGY:
${trainingContext.substring(0, 2000)}

SCENARIO: ${scenarioTitle}
STAGE: ${stage}
SETUP: ${scenarioSetup}
QUESTION: ${question}

ALL OPTIONS:
${optionsText}

THE TRAINEE CHOSE: "${selectedOption}"

Write 2-3 sentences explaining WHY this choice is good or could be improved, based on NEPQ principles and PCBancard methodology. Be specific about which sales technique applies. If they chose the best option, reinforce why it works. If not, explain what the better approach achieves. Keep it conversational and encouraging.`;

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: feedbackPrompt }] }],
        config: { maxOutputTokens: 250, temperature: 0.5 }
      });

      const feedback = response.text || "";
      res.json({ aiFeedback: feedback });
    } catch (error) {
      console.error('Error in scenario feedback:', error);
      res.status(500).json({ error: 'Failed to generate feedback' });
    }
  });

  // Create a new training session
  app.post("/api/training/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { mode, personaId, difficulty, scenarioId } = req.body;

      if (!mode || !['roleplay', 'gauntlet', 'scenario', 'delivery_analyzer'].includes(mode)) {
        return res.status(400).json({ error: "Invalid mode" });
      }

      const session = await storage.createTrainingSession({
        userId,
        mode,
        personaId: personaId || null,
        difficulty: difficulty || null,
        scenarioId: scenarioId || null,
      });

      res.json(session);
    } catch (error) {
      console.error('Error creating training session:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  // Save a message in a training session
  app.post("/api/training/sessions/:sessionId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid session ID" });

      const session = await storage.getTrainingSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ error: "Session not found" });
      }

      const { role, content } = req.body;
      if (!role || !content) {
        return res.status(400).json({ error: "Missing role or content" });
      }

      const message = await storage.createTrainingMessage({
        sessionId,
        role,
        content,
      });

      res.json(message);
    } catch (error) {
      console.error('Error saving training message:', error);
      res.status(500).json({ error: 'Failed to save message' });
    }
  });

  // Complete a training session
  app.post("/api/training/sessions/:sessionId/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid session ID" });

      const session = await storage.getTrainingSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.endedAt) {
        return res.json(session);
      }

      const {
        scorePercent,
        scoreDetails,
        aiFeedback,
        turnCount,
        durationSeconds,
        objectionsAttempted,
        objectionsPassed,
        perfectRun,
        stagesDetected,
        coveragePercent,
      } = req.body;

      let finalAiFeedback = aiFeedback;
      if (session.mode === 'roleplay' && !aiFeedback) {
        try {
          const messages = await storage.getTrainingMessages(sessionId);
          if (messages.length >= 4) {
            const persona = TRAINING_PERSONAS[session.personaId || ''];

            let trainingContext = '';
            try {
              const { getTrainingKnowledgeForRoleplay } = await import("./training-knowledge-context");
              trainingContext = await getTrainingKnowledgeForRoleplay(session.personaId || '');
            } catch (err) {}

            const conversationText = messages.map(m =>
              `${m.role === 'user' ? 'SALES REP' : 'MERCHANT'}: ${m.content}`
            ).join('\n');

            const hasGemini = process.env.AI_INTEGRATIONS_GEMINI_API_KEY && process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
            if (hasGemini) {
              const { GoogleGenAI } = await import("@google/genai");
              const genAI = new GoogleGenAI({
                apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
                httpOptions: { apiVersion: "", baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL! },
              });

              const evalPrompt = `You are an expert PCBancard sales coach evaluating a complete roleplay training session.

PCBANCARD SALES METHODOLOGY:
${trainingContext.substring(0, 3000)}

PERSONA: ${persona?.name || 'Unknown'} - ${persona?.systemPrompt?.substring(0, 200) || ''}

FULL CONVERSATION:
${conversationText}

Evaluate this session and respond in EXACTLY this format:
SCORE: [number 0-100]
TECHNIQUE_RAPPORT: [1-10 score for rapport building]
TECHNIQUE_QUESTIONING: [1-10 score for NEPQ questioning technique]
TECHNIQUE_OBJECTION: [1-10 score for objection handling]
TECHNIQUE_CLOSING: [1-10 score for moving toward next steps]
STRENGTH1: [first key strength observed]
STRENGTH2: [second key strength observed]
STRENGTH3: [third key strength observed]
IMPROVE1: [first area to improve with specific advice]
IMPROVE2: [second area to improve with specific advice]
IMPROVE3: [third area to improve with specific advice]
NEXT_STEP: [recommended next training activity]
SUMMARY: [2-3 sentence overall assessment]`;

              const response = await genAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ role: "user", parts: [{ text: evalPrompt }] }],
                config: { maxOutputTokens: 600, temperature: 0.3 }
              });

              const responseText = response.text || '';
              const parseField = (text: string, field: string): string => {
                const match = text.match(new RegExp(`${field}:\\s*(.+)`, 'i'));
                return match ? match[1].trim() : '';
              };
              const parseNumber = (text: string, field: string, def = 0): number => {
                const v = parseInt(parseField(text, field));
                return isNaN(v) ? def : v;
              };

              finalAiFeedback = {
                overallScore: parseNumber(responseText, 'SCORE', 50),
                techniqueScores: {
                  rapport: parseNumber(responseText, 'TECHNIQUE_RAPPORT', 5),
                  questioning: parseNumber(responseText, 'TECHNIQUE_QUESTIONING', 5),
                  objectionHandling: parseNumber(responseText, 'TECHNIQUE_OBJECTION', 5),
                  closing: parseNumber(responseText, 'TECHNIQUE_CLOSING', 5),
                },
                strengths: [parseField(responseText, 'STRENGTH1'), parseField(responseText, 'STRENGTH2'), parseField(responseText, 'STRENGTH3')].filter(s => s),
                improvements: [parseField(responseText, 'IMPROVE1'), parseField(responseText, 'IMPROVE2'), parseField(responseText, 'IMPROVE3')].filter(s => s),
                nextStep: parseField(responseText, 'NEXT_STEP'),
                summary: parseField(responseText, 'SUMMARY'),
              };
            }
          }
        } catch (evalError) {
          console.log('[TrainingSession] AI evaluation failed:', evalError);
        }
      }

      const aiScore = finalAiFeedback?.overallScore || scorePercent || 0;

      const updatedSession = await storage.updateTrainingSession(sessionId, {
        scorePercent: aiScore,
        scoreDetails: scoreDetails || null,
        aiFeedback: finalAiFeedback || null,
        turnCount: turnCount || null,
        durationSeconds: durationSeconds || null,
        objectionsAttempted: objectionsAttempted || null,
        objectionsPassed: objectionsPassed || null,
        perfectRun: perfectRun || false,
        stagesDetected: stagesDetected || null,
        coveragePercent: coveragePercent || null,
        endedAt: new Date(),
      });

      let xpResult = null;
      try {
        const { awardXP } = await import("./gamification-engine");

        let xpAmount = 0;
        let xpSource = 'interactive_training';
        let xpDescription = '';

        if (session.mode === 'roleplay') {
          const turns = turnCount || 0;
          const duration = durationSeconds || 0;
          if (turns >= 6 || duration >= 180) {
            xpAmount = 60;
            const performanceScore = finalAiFeedback?.overallScore || scorePercent || 0;
            const bonus = Math.floor((performanceScore / 100) * 40);
            xpAmount += bonus;
            xpDescription = `Roleplay session with ${session.personaId || 'unknown'} persona (Score: ${performanceScore}%, ${turns} turns)`;
          } else {
            xpDescription = `Roleplay session too short for XP (${turns} turns, ${duration}s)`;
          }
          xpSource = 'roleplay_session';
        } else if (session.mode === 'gauntlet') {
          const attempted = objectionsAttempted || 0;
          xpAmount = attempted * 15;
          const avgScore = attempted > 0 ? Math.round(((scorePercent || 0))) : 0;
          if (perfectRun || avgScore >= 90) {
            xpAmount += 50;
            xpDescription = `Gauntlet perfect run! ${attempted} objections (${avgScore}% avg)`;
          } else {
            xpDescription = `Gauntlet completed: ${attempted} objections (${avgScore}% avg)`;
          }
          xpSource = 'gauntlet_session';
        } else if (session.mode === 'scenario') {
          xpAmount = 40;
          const pct = scorePercent || 0;
          if (pct >= 80) {
            xpAmount += 20;
            xpDescription = `Scenario training excellent (${pct}%)`;
          } else {
            xpDescription = `Scenario training completed (${pct}%)`;
          }
          xpSource = 'scenario_session';
        } else if (session.mode === 'delivery_analyzer') {
          xpAmount = 80;
          const coverage = coveragePercent || 0;
          if (coverage >= 100) {
            xpAmount += 20;
            xpDescription = `Delivery analysis perfect coverage (${coverage}%)`;
          } else {
            xpDescription = `Delivery analysis completed (${coverage}% coverage)`;
          }
          xpSource = 'delivery_analysis';
        }

        if (xpAmount > 0) {
          xpResult = await awardXP(userId, xpAmount, xpSource, `session_${sessionId}`, xpDescription);

          await storage.updateTrainingSession(sessionId, { xpAwarded: xpResult.xpAwarded });

          if (session.mode === 'roleplay' || session.mode === 'gauntlet') {
            const { checkBadgeProgression } = await import("./gamification-engine");
            const sessions = await storage.getTrainingSessions(userId, session.mode, 1000);
            const completedCount = sessions.filter(s => s.endedAt).length;
            const badge = await checkBadgeProgression(userId, 'roleplay', completedCount);
            if (badge) {
              xpResult.newBadges = [...(xpResult.newBadges || []), badge];
            }
          }

          console.log(`[Training] Awarded ${xpResult.xpAwarded} XP to user ${userId} for ${session.mode} (${xpDescription})`);
        }

        // Recalculate skill score
        try {
          const { calculateSkillScore } = await import("./gamification-engine");
          const skillResult = await calculateSkillScore(userId);
          await storage.upsertGamificationProfile(userId, { skillScore: skillResult.overallScore });
        } catch (ssErr) {
          console.log('[Training] Skill score recalculation failed:', ssErr);
        }

        // Check progression ladder
        try {
          const { checkProgressionLadder } = await import("./gamification-engine");
          const ladderResult = await checkProgressionLadder(userId);
          if (xpResult) {
            (xpResult as any).ladderLevel = ladderResult.currentLevel;
            (xpResult as any).ladderTitle = ladderResult.currentTitle;
            (xpResult as any).skillScoreWarning = ladderResult.skillScoreWarning;
            (xpResult as any).warningMessage = ladderResult.warningMessage;
          }
        } catch (ladderErr) {
          console.log('[Training] Ladder check failed:', ladderErr);
        }
      } catch (xpError) {
        console.log('[Training] XP award failed:', xpError);
      }

      res.json({
        ...updatedSession,
        xpResult: xpResult || null,
      });
    } catch (error) {
      console.error('Error completing training session:', error);
      res.status(500).json({ error: 'Failed to complete session' });
    }
  });

  // Save a gauntlet objection response
  app.post("/api/training/sessions/:sessionId/gauntlet-response", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid session ID" });

      const session = await storage.getTrainingSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ error: "Session not found" });
      }

      const { objectionId, objectionText, userResponse, keywordScore, aiScore, aiFeedback } = req.body;

      const response = await storage.createGauntletResponse({
        sessionId,
        objectionId: objectionId || '',
        objectionText: objectionText || null,
        userResponse: userResponse || null,
        keywordScore: keywordScore || null,
        aiScore: aiScore || null,
        aiFeedback: aiFeedback || null,
      });

      res.json(response);
    } catch (error) {
      console.error('Error saving gauntlet response:', error);
      res.status(500).json({ error: 'Failed to save response' });
    }
  });

  // Get training session history for the current user
  app.get("/api/training/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const mode = req.query.mode as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;

      const sessions = await storage.getTrainingSessions(userId, mode, limit);
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching training sessions:', error);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  // Get a specific training session with messages
  app.get("/api/training/sessions/:sessionId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid session ID" });

      const session = await storage.getTrainingSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ error: "Session not found" });
      }

      let messages: any[] = [];
      let gauntletResponseList: any[] = [];

      if (session.mode === 'roleplay') {
        messages = await storage.getTrainingMessages(sessionId);
      }
      if (session.mode === 'gauntlet') {
        gauntletResponseList = await storage.getGauntletResponses(sessionId);
      }

      res.json({ ...session, messages, gauntletResponses: gauntletResponseList });
    } catch (error) {
      console.error('Error fetching training session:', error);
      res.status(500).json({ error: 'Failed to fetch session' });
    }
  });

  // Interactive Training Delivery Analyzer endpoint - Comprehensive AI Analysis
  app.post("/api/training/analyze-delivery", isAuthenticated, async (req: any, res) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Missing presentation text" });
      }

      if (text.trim().length < 50) {
        return res.status(400).json({ error: "Please provide a longer presentation script (at least 50 characters)" });
      }

      let trainingContext = '';
      try {
        const { getTrainingKnowledgeForDelivery } = await import("./training-knowledge-context");
        trainingContext = await getTrainingKnowledgeForDelivery();
      } catch (err) {
        console.log('[DeliveryAnalyzer] Training context unavailable');
      }

      const hasGeminiIntegrations = process.env.AI_INTEGRATIONS_GEMINI_API_KEY && process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
      if (!hasGeminiIntegrations) {
        return res.status(503).json({ error: "AI service not configured" });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const genAI = new GoogleGenAI({
        apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
        httpOptions: {
          apiVersion: "",
          baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
        },
      });

      // Two-phase analysis for reliability: structured markers first, then narrative feedback
      const stageNames = [
        "Visceral Opening",
        "Fee Quantification", 
        "Marcus Story",
        "Three Options",
        "Customer Reaction",
        "Social Proof",
        "Process Explanation",
        "90-Day Promise"
      ];
      
      // Phase 1: Structured analysis with simple format
      const structuredPrompt = `Analyze this PCBancard Dual Pricing sales presentation.

PRESENTATION:
${text}

PCBANCARD PRESENTATION METHODOLOGY:
${trainingContext}

THE 8 PRESENTATION STAGES TO CHECK:
1. Visceral Opening (Psychology Foundation) - Emotional hook about processing fee pain. Should create a knowledge gap and agitate the cost of inaction. Example: "Ever close the month and feel that quiet knot in your stomach?"
2. Fee Quantification (Problem Awareness) - Concrete numbers showing 3-4% fees, dollar amounts lost per transaction ($1.20-$1.60 on a $40 ticket), annual losses ($10K-$25K+). Should make the abstract concrete.
3. Marcus/Mike Story (Story Proof) - Named merchant success story showing transformation. The training uses "Mike's tire shop" - was losing $13,440/year, reinvested savings, hired 2 techs, opened Saturdays. Hero journey structure.
4. Three Options (Solution Positioning) - Present Interchange-Plus vs Surcharging vs Dual Pricing. Key: surcharging can't cover debit (30-40% of transactions), only dual pricing eliminates ALL fees.
5. Customer Reaction (Objection Prevention) - Address "will customers complain?" with data: only about 1 in 100 customers care. Gas station comparison. "By week three, most owners stop thinking about it."
6. Social Proof (Story Proof & Transformation) - Other merchants succeeding with the program. Community proof, reference offers, Darren Waller Foundation partnership.
7. Process Explanation (Friction Removal) - How the switch works: simple terminal swap, training provided, support available. Remove fear of hassle.
8. 90-Day Promise (Risk Reversal) - Risk-free guarantee. "If this program negatively impacts your business in any way, I will drive out here the same day." Month-to-month, no ETFs.

RESPOND WITH EXACTLY THIS FORMAT (one line per field):
SCORE: [number 0-100]
STAGE1: [FOUND/MISSING] [brief reason]
STAGE2: [FOUND/MISSING] [brief reason]
STAGE3: [FOUND/MISSING] [brief reason]
STAGE4: [FOUND/MISSING] [brief reason]
STAGE5: [FOUND/MISSING] [brief reason]
STAGE6: [FOUND/MISSING] [brief reason]
STAGE7: [FOUND/MISSING] [brief reason]
STAGE8: [FOUND/MISSING] [brief reason]
PRIMARY_APPEAL: [Driver/Expressive/Analytical/Amiable]
EMOTIONAL_PROBLEM: [1-5]
EMOTIONAL_HOPE: [1-5]
EMOTIONAL_PROOF: [1-5]
EMOTIONAL_SAFETY: [1-5]
STRENGTH1: [first key strength]
STRENGTH2: [second key strength]
GAP1: [first area to improve]
GAP2: [second area to improve]
NEXT_DRILL: [specific practice exercise]`;

      console.log('[DeliveryAnalyzer] Starting structured analysis...');
      
      const structuredResponse = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: structuredPrompt }] }],
        config: { maxOutputTokens: 800, temperature: 0.2 }
      });
      
      let structuredText = structuredResponse.text || "";
      console.log('[DeliveryAnalyzer] Structured response length:', structuredText.length);
      
      // Parse structured response
      const parseField = (responseText: string, field: string): string => {
        const match = responseText.match(new RegExp(`${field}:\\s*(.+)`, 'i'));
        return match ? match[1].trim() : '';
      };
      
      const parseNumber = (responseText: string, field: string, defaultVal = 0): number => {
        const val = parseField(responseText, field);
        const num = parseInt(val);
        return isNaN(num) ? defaultVal : num;
      };
      
      // Validate parsing - check if we got key required fields
      const hasRequiredFields = (responseText: string): boolean => {
        const scoreVal = parseField(responseText, 'SCORE');
        const stage1Val = parseField(responseText, 'STAGE1');
        return !!scoreVal && !!stage1Val;
      };
      
      // Retry once with stricter prompt if initial parse fails
      if (!hasRequiredFields(structuredText)) {
        console.log('[DeliveryAnalyzer] Initial parse failed, retrying with stricter prompt...');
        const retryPrompt = `Analyze this sales presentation and respond ONLY in this exact format (nothing else):

PRESENTATION: ${text.substring(0, 500)}

YOUR RESPONSE MUST BE EXACTLY:
SCORE: [write a number 0-100]
STAGE1: [FOUND or MISSING]
STAGE2: [FOUND or MISSING]
STAGE3: [FOUND or MISSING]
STAGE4: [FOUND or MISSING]
STAGE5: [FOUND or MISSING]
STAGE6: [FOUND or MISSING]
STAGE7: [FOUND or MISSING]
STAGE8: [FOUND or MISSING]
STRENGTH1: [one strength]
GAP1: [one weakness]`;

        const retryResponse = await genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: retryPrompt }] }],
          config: { maxOutputTokens: 400, temperature: 0.1 }
        });
        
        structuredText = retryResponse.text || structuredText;
        console.log('[DeliveryAnalyzer] Retry response length:', structuredText.length);
      }
      
      const score = parseNumber(structuredText, 'SCORE', 50);
      
      // Parse stages
      const detectedStages = stageNames.map((name, idx) => {
        const stageNum = idx + 1;
        const stageData = parseField(structuredText, `STAGE${stageNum}`);
        const found = stageData.toUpperCase().includes('FOUND');
        const reason = stageData.replace(/^(FOUND|MISSING)\s*/i, '').trim();
        
        return {
          id: stageNum,
          name,
          found,
          excerpts: [],
          strength: found ? 'adequate' as const : 'missing' as const,
          improvement: found ? undefined : reason || `Add content covering ${name}`
        };
      });
      
      // Parse psychographic and emotional data
      const primaryAppeal = parseField(structuredText, 'PRIMARY_APPEAL') || 'Driver';
      const emotionalArc = {
        problemAgitation: parseNumber(structuredText, 'EMOTIONAL_PROBLEM', 3),
        hopeInjection: parseNumber(structuredText, 'EMOTIONAL_HOPE', 3),
        proofStacking: parseNumber(structuredText, 'EMOTIONAL_PROOF', 3),
        safetyNet: parseNumber(structuredText, 'EMOTIONAL_SAFETY', 3),
        overallFlow: ''
      };
      
      const topStrengths = [parseField(structuredText, 'STRENGTH1'), parseField(structuredText, 'STRENGTH2')].filter(s => s);
      const criticalGaps = [parseField(structuredText, 'GAP1'), parseField(structuredText, 'GAP2')].filter(s => s);
      const nextStepDrill = parseField(structuredText, 'NEXT_DRILL');
      
      // Phase 2: Generate narrative coaching feedback
      console.log('[DeliveryAnalyzer] Generating coaching narrative...');
      
      const narrativePrompt = `You are an encouraging PCBancard sales coach trained in NEPQ methodology. Write 3-4 paragraphs of feedback for this sales presentation.

PCBANCARD METHODOLOGY CONTEXT:
${trainingContext.substring(0, 2000)}

PRESENTATION:
${text}

ANALYSIS SUMMARY:
- Score: ${score}%
- Stages covered: ${detectedStages.filter(s => s.found).length}/8
- Strengths: ${topStrengths.join(', ') || 'Shows effort'}
- Areas to improve: ${criticalGaps.join(', ') || 'Keep practicing'}

Write encouraging but honest feedback in second person ("You did X well..."). Include:
1. What they're doing well with specific examples
2. What's missing or could be stronger
3. One concrete tip to practice next
- Reference specific PCBancard techniques and NEPQ principles in your feedback
- If they used the Mike/Marcus story, note that. If they missed it, suggest adding it.
- Assess whether they positioned the three options correctly (interchange-plus, surcharging, dual pricing)
- Check if they addressed the customer reaction fear with real data (1 in 100)

Be specific, actionable, and supportive. No headers or bullet points - just flowing paragraphs.`;

      const narrativeResponse = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: narrativePrompt }] }],
        config: { maxOutputTokens: 600, temperature: 0.6 }
      });
      
      const feedback = narrativeResponse.text || "Analysis complete. Keep practicing your presentation!";
      console.log('[DeliveryAnalyzer] Coaching narrative generated:', feedback.length, 'chars');
      
      // Build complete response
      const psychographicAnalysis = {
        primaryAppeal,
        missingAppeals: ['Driver', 'Expressive', 'Analytical', 'Amiable'].filter(t => 
          t.toLowerCase() !== primaryAppeal.toLowerCase()
        ).slice(0, 2),
        recommendation: `Consider adding elements that appeal to ${['Driver', 'Expressive', 'Analytical', 'Amiable'].find(t => t.toLowerCase() !== primaryAppeal.toLowerCase())} personalities.`
      };
      
      emotionalArc.overallFlow = `Your presentation scores ${Math.round((emotionalArc.problemAgitation + emotionalArc.hopeInjection + emotionalArc.proofStacking + emotionalArc.safetyNet) / 4 * 20)}% on emotional engagement.`;
      
      // Check if we have meaningful results
      const stagesFound = detectedStages.filter(s => s.found).length;
      const isPartialResult = !hasRequiredFields(structuredText) || stagesFound === 0;
      
      if (isPartialResult) {
        console.log('[DeliveryAnalyzer] WARN: Partial result - parse may have failed. Score:', score, 'Stages:', stagesFound);
      } else {
        console.log('[DeliveryAnalyzer] Analysis complete. Score:', score, 'Stages found:', stagesFound);
      }

      res.json({ 
        feedback,
        score,
        detectedStages,
        psychographicAnalysis,
        emotionalArc,
        topStrengths: topStrengths.length > 0 ? topStrengths : ['Good effort on your presentation'],
        criticalGaps: criticalGaps.length > 0 ? criticalGaps : ['Continue practicing all 8 stages'],
        nextStepDrill: nextStepDrill || 'Practice delivering your presentation out loud',
        isPartialResult
      });
    } catch (error) {
      console.error('[DeliveryAnalyzer] Error in delivery analysis:', error);
      res.status(500).json({ error: 'Failed to analyze delivery. Please try again.' });
    }
  });

  // ==================== GAMIFICATION ROUTES ====================

  app.get("/api/gamification/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      const profile = await getGamificationProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching gamification profile:", error);
      res.status(500).json({ error: "Failed to fetch gamification profile" });
    }
  });

  app.get("/api/gamification/skill-score", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { calculateSkillScore } = await import("./gamification-engine");
      const result = await calculateSkillScore(userId);

      await storage.upsertGamificationProfile(userId, { skillScore: result.overallScore });

      res.json(result);
    } catch (error) {
      console.error('Error calculating skill score:', error);
      res.status(500).json({ error: 'Failed to calculate skill score' });
    }
  });

  app.get("/api/gamification/progression-ladder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { checkProgressionLadder } = await import("./gamification-engine");
      const result = await checkProgressionLadder(userId);

      res.json(result);
    } catch (error) {
      console.error('Error checking progression ladder:', error);
      res.status(500).json({ error: 'Failed to check progression ladder' });
    }
  });

  app.get("/api/gamification/leaderboard", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await getLeaderboard(membership.organization.id, limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/gamification/badges", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      const badges = await storage.getBadgesForUser(userId);
      res.json(badges);
    } catch (error) {
      console.error("Error fetching badges:", error);
      res.status(500).json({ error: "Failed to fetch badges" });
    }
  });

  app.get("/api/gamification/xp-history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getXpLedger(userId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching XP history:", error);
      res.status(500).json({ error: "Failed to fetch XP history" });
    }
  });

  app.get("/api/gamification/certificates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      const certs = await storage.getCertificatesForUser(userId);
      res.json(certs);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      res.status(500).json({ error: "Failed to fetch certificates" });
    }
  });

  app.get("/api/gamification/certificates/:code/verify", async (req: any, res) => {
    try {
      const { code } = req.params;
      const cert = await storage.getCertificateByVerification(code);
      if (!cert) {
        return res.status(404).json({ error: "Certificate not found" });
      }
      res.json(cert);
    } catch (error) {
      console.error("Error verifying certificate:", error);
      res.status(500).json({ error: "Failed to verify certificate" });
    }
  });

  app.get("/api/gamification/certificates/check-eligibility", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      const eligible = await checkCertificateEligibility(userId);
      const eligibleWithDetails = eligible.map(type => ({
        type,
        ...CERTIFICATE_TYPES[type as keyof typeof CERTIFICATE_TYPES],
      }));
      res.json({ eligible: eligibleWithDetails });
    } catch (error) {
      console.error("[Certificates] Error checking eligibility:", error);
      res.status(500).json({ error: "Failed to check certificate eligibility" });
    }
  });

  app.post("/api/gamification/certificates/generate", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { certificateType } = req.body;

      if (!certificateType || !CERTIFICATE_TYPES[certificateType as keyof typeof CERTIFICATE_TYPES]) {
        return res.status(400).json({ error: "Invalid certificate type" });
      }

      const existing = await storage.getCertificatesForUser(userId);
      if (existing.some(c => c.certificateType === certificateType)) {
        return res.status(400).json({ error: "Certificate already earned" });
      }

      const eligible = await checkCertificateEligibility(userId);
      if (!eligible.includes(certificateType)) {
        return res.status(403).json({ error: "Not yet eligible for this certificate" });
      }

      const certDef = CERTIFICATE_TYPES[certificateType as keyof typeof CERTIFICATE_TYPES];
      const verificationCode = generateVerificationCode();

      const certificate = await storage.createCertificate({
        userId,
        certificateType,
        title: certDef.title,
        description: certDef.description,
        verificationCode,
      });

      const profile = await storage.getGamificationProfile(userId);
      if (profile) {
        await storage.upsertGamificationProfile(userId, {
          certificatesEarned: (profile.certificatesEarned || 0) + 1,
        });
      }

      res.json(certificate);
    } catch (error) {
      console.error("[Certificates] Error generating certificate:", error);
      res.status(500).json({ error: "Failed to generate certificate" });
    }
  });

  app.get("/api/gamification/certificates/:id/download", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const certId = parseInt(req.params.id);

      // Allow admin to download any cert, otherwise must own it
      const isAdmin = req.orgMembership?.role === 'master_admin';
      let cert: any;
      
      if (!isAdmin) {
        const certs = await storage.getCertificatesForUser(userId);
        cert = certs.find(c => c.id === certId);
        if (!cert) {
          return res.status(404).json({ error: "Certificate not found" });
        }
      } else {
        // Admin can access any certificate
        const allCerts = await storage.getAllCertificates?.();
        cert = allCerts?.find(c => c.id === certId);
        if (!cert) {
          return res.status(404).json({ error: "Certificate not found" });
        }
      }

      const membership = req.orgMembership;
      const recipientName = membership
        ? `${membership.firstName || ''} ${membership.lastName || ''}`.trim() || 'Agent'
        : 'Agent';

      const pdfBuffer = await generateCertificatePDF({
        recipientName,
        certificateType: cert.certificateType,
        title: cert.title,
        description: cert.description || '',
        issuedDate: new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        verificationCode: cert.verificationCode,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="certificate-${cert.verificationCode}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("[Certificates] Error downloading certificate:", error);
      res.status(500).json({ error: "Failed to download certificate" });
    }
  });

  app.get("/api/gamification/admin/org-profiles", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const role = req.orgMembership.role;
      if (role !== "master_admin" && role !== "relationship_manager") {
        return res.status(403).json({ error: "Admin or manager role required" });
      }
      const members = await storage.getOrganizationMembers(req.orgMembership.orgId);
      const userIds = members.map((m: any) => m.userId);
      const profiles = await storage.getOrgGamificationProfiles(userIds);
      const profileMap: Record<string, any> = {};
      for (const profile of profiles) {
        profileMap[profile.userId] = {
          totalXp: profile.totalXp,
          currentLevel: profile.currentLevel,
          currentStreak: profile.currentStreak,
          badgesEarned: profile.badgesEarned,
          skillScore: profile.skillScore || 0,
        };
      }
      res.json({ profiles: profileMap });
    } catch (error) {
      console.error("Error fetching org gamification profiles:", error);
      res.status(500).json({ error: "Failed to fetch org gamification profiles" });
    }
  });

  app.get("/api/gamification/admin/agent/:userId/training", isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user?.claims?.sub;
      if (!requestingUserId) return res.status(401).json({ error: "Unauthorized" });

      const { isAdmin } = await import("./rbac");
      const requestingMember = await storage.getUserMembership(requestingUserId);
      if (!requestingMember || !isAdmin(requestingMember.role)) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const targetUserId = req.params.userId;

      const { getGamificationProfile, calculateSkillScore, checkProgressionLadder } = await import("./gamification-engine");

      const profile = await getGamificationProfile(targetUserId);
      const skillScore = await calculateSkillScore(targetUserId);
      const ladder = await checkProgressionLadder(targetUserId);

      const sessions = await storage.getTrainingSessions(targetUserId, undefined, 50);

      const modeStats: Record<string, { count: number; avgScore: number; totalXp: number; lastDate: string | null }> = {};
      for (const mode of ['roleplay', 'gauntlet', 'scenario', 'delivery_analyzer']) {
        const modeSessions = sessions.filter(s => s.mode === mode && s.endedAt);
        modeStats[mode] = {
          count: modeSessions.length,
          avgScore: modeSessions.length > 0
            ? Math.round(modeSessions.reduce((sum, s) => sum + (s.scorePercent || 0), 0) / modeSessions.length)
            : 0,
          totalXp: modeSessions.reduce((sum, s) => sum + (s.xpAwarded || 0), 0),
          lastDate: modeSessions[0]?.startedAt?.toISOString() || null,
        };
      }

      res.json({
        profile,
        skillScore,
        ladder,
        modeStats,
        recentSessions: sessions.slice(0, 20),
      });
    } catch (error) {
      console.error('Error fetching agent training details:', error);
      res.status(500).json({ error: 'Failed to fetch training details' });
    }
  });

  app.post("/api/gamification/admin/award-xp", isAuthenticated, requireRole("master_admin"), async (req: any, res) => {
    try {
      const { userId, amount, description } = req.body;
      if (!userId || !amount) {
        return res.status(400).json({ error: "userId and amount are required" });
      }
      const result = await awardXP(userId, amount, "admin_award", undefined, description || "Manual XP award by admin");
      res.json(result);
    } catch (error) {
      console.error("Error awarding XP:", error);
      res.status(500).json({ error: "Failed to award XP" });
    }
  });

  // ==========================================
  // EARNED ITEMS (Visual Badge/Tier/Seal/Stage)
  // ==========================================
  
  app.get("/api/certificates/earned", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      const type = req.query.type as string | undefined;
      const items = await storage.getEarnedItems(userId, type);
      res.json({ earnedItems: items });
    } catch (error) {
      console.error("[EarnedItems] Error:", error);
      res.status(500).json({ error: "Failed to fetch earned items" });
    }
  });

  app.post("/api/certificates/award", isAuthenticated, async (req: any, res) => {
    try {
      const { userId, type, assetId, title, metadata } = req.body;
      
      const validTypes = ['tier', 'badge', 'seal', 'stage'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: "Invalid type. Must be: tier, badge, seal, or stage" });
      }
      
      const manifest = getAssetManifest();
      const manifestAssets = manifest.assets as Record<string, any>;
      if (!manifestAssets[assetId]) {
        return res.status(400).json({ error: `Unknown assetId: ${assetId}` });
      }
      
      const targetUserId = userId || req.user.claims.sub;
      const existing = await storage.getEarnedItem(targetUserId, assetId);
      if (existing) {
        return res.status(409).json({ error: "Item already earned", earnedItem: existing });
      }
      
      const item = await storage.createEarnedItem({
        userId: targetUserId,
        type,
        assetId,
        title: title || manifestAssets[assetId].displayName,
        metadata: metadata || {},
      });
      
      res.json({ earnedItem: item });
    } catch (error) {
      console.error("[EarnedItems] Error awarding:", error);
      res.status(500).json({ error: "Failed to award item" });
    }
  });

  // ==========================================
  // CERTIFICATE PDF GENERATION (with visual assets)
  // ==========================================
  
  app.post("/api/certificates/generate-visual", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { primaryAssetId, secondaryAssetIds, recipientName } = req.body;
      
      if (!primaryAssetId) {
        return res.status(400).json({ error: "primaryAssetId is required" });
      }
      
      const manifest = getAssetManifest();
      const certAssets = manifest.assets as Record<string, any>;
      if (!certAssets[primaryAssetId]) {
        return res.status(400).json({ error: `Unknown asset: ${primaryAssetId}` });
      }
      
      const asset = certAssets[primaryAssetId];
      const verificationCode = generateVerificationCode();
      
      const certTypeMap: Record<string, string> = {
        'tier': 'tier_certificate',
        'badge': 'module_certificate',
        'seal': 'partner_certificate',
        'stage': 'stage_certificate',
      };
      
      const membership = req.orgMembership;
      const name = recipientName || (membership
        ? `${membership.firstName || ''} ${membership.lastName || ''}`.trim() || 'Agent'
        : 'Agent');
      
      const cert = await storage.createGeneratedCertificate({
        userId,
        certificateType: certTypeMap[asset.type] || 'module_certificate',
        borderId: 'border.master',
        primaryAssetId,
        secondaryAssetIds: secondaryAssetIds || [],
        recipientName: name,
        issuedBy: 'PCBancard Training Division',
        verificationCode,
        status: 'active',
        metadata: {},
      });
      
      res.json(cert);
    } catch (error) {
      console.error("[Certificates] Error generating visual certificate:", error);
      res.status(500).json({ error: "Failed to generate certificate" });
    }
  });

  app.get("/api/certificates/verify/:code", async (req: any, res) => {
    try {
      const { code } = req.params;
      const cert = await storage.getGeneratedCertificateByVerification(code);
      if (!cert) {
        return res.status(404).json({ valid: false, error: "Certificate not found" });
      }
      res.json({
        valid: cert.status === 'active',
        certificate: {
          recipientName: cert.recipientName,
          certificateType: cert.certificateType,
          issuedAt: cert.issuedAt,
          issuedBy: cert.issuedBy,
          status: cert.status,
        },
      });
    } catch (error) {
      console.error("[Certificates] Verify error:", error);
      res.status(500).json({ error: "Failed to verify certificate" });
    }
  });

  // ==========================================
  // ASSET MANIFEST & ADMIN
  // ==========================================
  
  app.get("/api/certificates/manifest", async (_req: any, res) => {
    try {
      const manifest = getAssetManifest();
      res.json(manifest);
    } catch (error) {
      res.status(500).json({ error: "Failed to load asset manifest" });
    }
  });
  
  app.post("/api/admin/generate-certificate-assets", isAuthenticated, async (req: any, res) => {
    try {
      const isAdmin = req.orgMembership?.role === 'master_admin';
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const result = await generateAllAssets();
      res.json({ generated: 18, errors: [], message: "All certificate assets regenerated successfully" });
    } catch (error) {
      console.error("[Admin] Error generating assets:", error);
      res.status(500).json({ error: "Failed to generate certificate assets" });
    }
  });

  app.get("/api/certificates/generated/:id/download", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const certId = parseInt(req.params.id);
      
      const certs = await storage.getGeneratedCertificates(userId);
      const cert = certs.find(c => c.id === certId);
      if (!cert) {
        return res.status(404).json({ error: "Certificate not found" });
      }
      
      const { generateVisualCertificatePDF } = await import("./certificate-generator");
      const pdfBuffer = await generateVisualCertificatePDF({
        recipientName: cert.recipientName,
        certificateTitle: cert.certificateType.replace(/_/g, ' ').toUpperCase(),
        description: `Awarded for achieving ${cert.primaryAssetId.replace(/\./g, ' ')} certification.`,
        primaryAssetId: cert.primaryAssetId,
        secondaryAssetIds: (cert.secondaryAssetIds as string[]) || [],
        issuedBy: cert.issuedBy,
        verificationCode: cert.verificationCode,
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="certificate-${cert.verificationCode}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("[Certificates] Download error:", error);
      res.status(500).json({ error: "Failed to download certificate" });
    }
  });

  // ─── One-Page Proposal: PDF Text Extraction ──────────────────────────
  const onePageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

  app.post("/api/one-page-proposal/extract-pdf-text", isAuthenticated, onePageUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const pdfParseModule = await import("pdf-parse");
      const pdfParse = (pdfParseModule as any).default || pdfParseModule;
      const parsed = await pdfParse(req.file.buffer);
      const text = parsed.text || "";

      const { extractSavingsFromText } = await import("./one-page-pdf-service");
      const savings = extractSavingsFromText(text);

      res.json({
        ...savings,
        rawText: text.substring(0, 2000),
      });
    } catch (error) {
      console.error("[OnePageProposal] PDF extraction error:", error);
      res.status(500).json({ error: "Failed to extract PDF text" });
    }
  });

  // ─── One-Page Proposal: PDF Generation ──────────────────────────────
  app.post("/api/one-page-proposal/generate", isAuthenticated, async (req: any, res) => {
    try {
      const { templateId, merchantName, agentName, agentTitle, agentPhone, agentEmail, equipment, savings, merchantStatementUploaded, generationMode, merchantWebsite, templateName, templateCategory } = req.body;

      if (!templateId || !merchantName || !agentName) {
        return res.status(400).json({ error: "templateId, merchantName, and agentName are required" });
      }

      let aiContent = undefined;
      let aiFallback = false;

      if (generationMode === "ai-custom") {
        try {
          const { scrapeWebsiteContext, generateAICustomContent } = await import("./one-page-ai-service");

          let websiteContext = null;
          if (merchantWebsite) {
            websiteContext = await scrapeWebsiteContext(merchantWebsite);
            if (!websiteContext) {
              console.log("[OnePageProposal] Website scrape failed, continuing without website context");
            }
          }

          const result = await generateAICustomContent({
            templateName: templateName || templateId,
            templateCategory: templateCategory || "Savings Proposals",
            merchantName,
            websiteContext,
            financials: {
              dualPricing: savings?.dualPricing || null,
              interchangePlus: savings?.interchangePlus || null,
            },
            equipment: equipment || null,
            agentName,
          });

          if (result) {
            aiContent = result;
          } else {
            aiFallback = true;
            console.log("[OnePageProposal] AI generation failed, falling back to Template-Fill");
          }
        } catch (aiError) {
          aiFallback = true;
          console.error("[OnePageProposal] AI-Custom error, falling back to Template-Fill:", aiError);
        }
      }

      const { generateOnePagePdf } = await import("./one-page-pdf-service");
      const pdfBuffer = await generateOnePagePdf({
        templateId,
        merchantName,
        agentName,
        agentTitle,
        agentPhone,
        agentEmail,
        equipment: equipment || null,
        savings: savings || null,
        merchantStatementUploaded: !!merchantStatementUploaded,
        aiContent,
      });

      const safeName = merchantName.replace(/[^a-zA-Z0-9]/g, "_");
      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `OnePageProposal_${safeName}_${dateStr}_${templateId}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      if (aiFallback) {
        res.setHeader("X-AI-Fallback", "true");
      }
      res.send(pdfBuffer);
    } catch (error) {
      console.error("[OnePageProposal] Generation error:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  async function checkVideoBadges(userId: string, completedCount: number, allProgress: any[]): Promise<string[]> {
    const newBadges: string[] = [];
    const VIDEO_BADGES = [
      { id: 'video_first_watch', name: 'First Video', condition: (count: number) => count >= 1, level: 1, category: 'videos' },
      { id: 'video_halfway', name: 'Halfway There', condition: (count: number) => count >= 4, level: 2, category: 'videos' },
      { id: 'video_all_complete', name: 'Video Master', condition: (count: number) => count >= 8, level: 3, category: 'videos' },
    ];
    
    for (const badge of VIDEO_BADGES) {
      if (badge.condition(completedCount)) {
        try {
          const existing = await db.select().from(badgesEarned)
            .where(and(eq(badgesEarned.userId, userId), eq(badgesEarned.badgeId, badge.id)));
          if (existing.length === 0) {
            await db.insert(badgesEarned).values({
              userId,
              badgeId: badge.id,
              badgeLevel: badge.level,
              category: badge.category,
            });
            newBadges.push(badge.name);
          }
        } catch (e) {
          console.log(`Badge ${badge.id} already earned by user ${userId}`);
        }
      }
    }
    
    if (completedCount >= 8) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const allToday = allProgress.every(p => p.completedAt && new Date(p.completedAt) >= today);
      if (allToday) {
        try {
          const existing = await db.select().from(badgesEarned)
            .where(and(eq(badgesEarned.userId, userId), eq(badgesEarned.badgeId, 'video_speed_learner')));
          if (existing.length === 0) {
            await db.insert(badgesEarned).values({
              userId,
              badgeId: 'video_speed_learner',
              badgeLevel: 4,
              category: 'videos',
            });
            newBadges.push('Speed Learner');
          }
        } catch (e) {
          console.log(`Speed Learner badge already earned by user ${userId}`);
        }
      }
    }
    
    return newBadges;
  }

  app.get("/api/training/video-progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const progress = await db.select().from(videoWatchProgress).where(eq(videoWatchProgress.userId, userId));
      res.json(progress);
    } catch (error) {
      console.error("Error fetching video progress:", error);
      res.status(500).json({ error: "Failed to fetch video progress" });
    }
  });

  app.post("/api/training/video-progress/:videoId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const { videoId } = req.params;
      
      const bodySchema = z.object({
        action: z.enum(["start", "progress", "complete"]),
        watchTimeSeconds: z.number().optional(),
      });
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.message });
      }
      const { action, watchTimeSeconds } = parsed.data;

      const existing = await db.select().from(videoWatchProgress)
        .where(and(eq(videoWatchProgress.userId, userId), eq(videoWatchProgress.videoId, videoId)));
      
      if (action === "start") {
        if (existing.length === 0) {
          const [record] = await db.insert(videoWatchProgress).values({
            userId,
            videoId,
            watchTimeSeconds: 0,
            completed: false,
          }).returning();
          return res.json(record);
        }
        return res.json(existing[0]);
      }
      
      if (action === "progress") {
        if (existing.length === 0) {
          const [record] = await db.insert(videoWatchProgress).values({
            userId,
            videoId,
            watchTimeSeconds: watchTimeSeconds || 0,
            completed: false,
          }).returning();
          return res.json(record);
        }
        const [updated] = await db.update(videoWatchProgress)
          .set({ 
            watchTimeSeconds: watchTimeSeconds || existing[0].watchTimeSeconds,
            lastWatchedAt: new Date(),
          })
          .where(and(eq(videoWatchProgress.userId, userId), eq(videoWatchProgress.videoId, videoId)))
          .returning();
        return res.json(updated);
      }
      
      if (action === "complete") {
        if (existing.length === 0) {
          const [record] = await db.insert(videoWatchProgress).values({
            userId,
            videoId,
            watchTimeSeconds: watchTimeSeconds || 0,
            completed: true,
            completedAt: new Date(),
          }).returning();
          const allProgress = await db.select().from(videoWatchProgress)
            .where(and(eq(videoWatchProgress.userId, userId), eq(videoWatchProgress.completed, true)));
          const completedCount = allProgress.length + 1;
          const badges = await checkVideoBadges(userId, completedCount, allProgress);
          return res.json({ progress: record, badges });
        }
        const [updated] = await db.update(videoWatchProgress)
          .set({ 
            completed: true,
            completedAt: new Date(),
            watchTimeSeconds: watchTimeSeconds || existing[0].watchTimeSeconds,
            lastWatchedAt: new Date(),
          })
          .where(and(eq(videoWatchProgress.userId, userId), eq(videoWatchProgress.videoId, videoId)))
          .returning();
        const allProgress = await db.select().from(videoWatchProgress)
          .where(and(eq(videoWatchProgress.userId, userId), eq(videoWatchProgress.completed, true)));
        const completedCount = allProgress.length;
        const badges = await checkVideoBadges(userId, completedCount, allProgress);
        return res.json({ progress: updated, badges });
      }
      
      res.status(400).json({ error: "Invalid action. Use 'start', 'progress', or 'complete'" });
    } catch (error) {
      console.error("Error updating video progress:", error);
      res.status(500).json({ error: "Failed to update video progress" });
    }
  });

  app.get("/api/training/video-progress/user/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user?.claims?.sub;
      if (!requestingUserId) return res.status(401).json({ error: "Unauthorized" });
      const { isAdmin } = await import("./rbac");
      const requestingMember = await storage.getUserMembership(requestingUserId);
      if (!requestingMember || !isAdmin(requestingMember.role)) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const targetUserId = req.params.userId;
      const progress = await db.select().from(videoWatchProgress).where(eq(videoWatchProgress.userId, targetUserId));
      res.json(progress);
    } catch (error) {
      console.error("Error fetching user video progress:", error);
      res.status(500).json({ error: "Failed to fetch video progress" });
    }
  });

  app.get("/api/admin/agent/:userId/training-overview", isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user?.claims?.sub;
      if (!requestingUserId) return res.status(401).json({ error: "Unauthorized" });
      const { isAdmin } = await import("./rbac");
      const requestingMember = await storage.getUserMembership(requestingUserId);
      if (!requestingMember || !isAdmin(requestingMember.role)) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const targetUserId = req.params.userId;
      
      const targetMember = await storage.getUserMembership(targetUserId);
      
      const videoProgress = await db.select().from(videoWatchProgress)
        .where(eq(videoWatchProgress.userId, targetUserId));
      const videosCompleted = videoProgress.filter(v => v.completed).length;
      
      const presProgress = await db.select().from(presentationProgress)
        .where(eq(presentationProgress.userId, targetUserId));
      const presLessons = await db.select().from(presentationLessons);
      const modulesCompleted = presProgress.filter(p => p.completed).length;
      
      const sessions = await storage.getTrainingSessions(targetUserId, undefined, 50);
      const completedSessions = sessions.filter(s => s.endedAt);
      const roleplaySessions = completedSessions.filter(s => s.mode === 'roleplay');
      const avgScore = completedSessions.length > 0 
        ? Math.round(completedSessions.reduce((sum, s) => sum + (s.scorePercent || 0), 0) / completedSessions.length)
        : 0;
      
      const equipResults = await db.select().from(equipmentQuizResults)
        .where(eq(equipmentQuizResults.userId, targetUserId));
      const uniqueVendors = new Set(equipResults.map(r => r.vendorId).filter(Boolean));
      
      const streakData = await db.select().from(dailyEdgeStreaks)
        .where(eq(dailyEdgeStreaks.userId, targetUserId));
      const streak = streakData[0] || null;
      
      const badges = await db.select().from(badgesEarned)
        .where(eq(badgesEarned.userId, targetUserId));
      
      const gamProfile = await db.select().from(gamificationProfiles)
        .where(eq(gamificationProfiles.userId, targetUserId));
      
      const totalTasks = 8 + presLessons.length + 6;
      const completedTasks = videosCompleted + modulesCompleted + uniqueVendors.size;
      const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      res.json({
        user: targetMember ? {
          id: targetMember.userId,
          role: targetMember.role,
          stage: (targetMember as any).agentStage,
          joinedAt: targetMember.createdAt,
        } : null,
        overallProgress,
        videos: {
          completed: videosCompleted,
          total: 8,
          items: videoProgress,
        },
        presentationTraining: {
          modulesCompleted,
          totalModules: presLessons.length,
          items: presProgress.map(p => {
            const lesson = presLessons.find(l => l.id === p.lessonId);
            return { ...p, lessonTitle: lesson?.title || `Lesson ${p.lessonId}`, moduleNumber: lesson?.moduleId };
          }),
        },
        salesCoach: {
          sessionsCompleted: completedSessions.length,
          averageScore: avgScore,
          recentSessions: completedSessions.slice(0, 10).map(s => ({
            id: s.id,
            mode: s.mode,
            personaId: s.personaId,
            scorePercent: s.scorePercent,
            startedAt: s.startedAt,
            endedAt: s.endedAt,
            xpAwarded: s.xpAwarded,
          })),
        },
        equipiq: {
          vendorsCompleted: uniqueVendors.size,
          totalVendors: 6,
          results: equipResults,
        },
        dailyEdge: streak ? {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastCompleted: streak.lastActiveDate,
        } : null,
        badges,
        gamification: gamProfile[0] || null,
      });
    } catch (error) {
      console.error("Error fetching training overview:", error);
      res.status(500).json({ error: "Failed to fetch training overview" });
    }
  });

  return httpServer;
}
