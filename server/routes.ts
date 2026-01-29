import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
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
} from "@shared/schema";
import { sendInvitationEmail, sendFeedbackEmail, generateInviteToken, sendThankYouEmail, sendMeetingRecordingEmail, sendRoleplaySessionEmail } from "./email";
import { insertMeetingRecordingSchema } from "@shared/schema";
import { exportReferrals, exportDrops, exportMerchants, ExportFormat } from "./export";
import {
  getBusinessRiskProfile,
  UNDERWRITING_AI_CONTEXT,
  generateAgentSuggestions,
  checkProhibitedBusiness,
} from "./underwriting";
import { getEmailPrompt, SIGNAPAY_SALES_SCRIPT } from "./sales-script";
import {
  SALES_TRAINING_KNOWLEDGE,
  getBusinessContextPrompt,
  getScenarioPrompt,
  getCoachingHint,
  ROLEPLAY_PERSONAS,
  buildDailyEdgeCoachingContext,
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
  listCoachingDocuments, 
  getAllCoachingContent, 
  buildDriveKnowledgeContext,
  isDriveConnected,
  syncDriveToDatabase 
} from "./google-drive";
import { seedDailyEdgeContent } from "./daily-edge-seed";
import { seedEquipIQData } from "./equipiq-seed";
import { seedPresentationContent } from "./presentation-seed";
import fs from "fs";
import path from "path";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication first
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Setup object storage routes
  registerObjectStorageRoutes(app);

  // Seed Daily Edge content if not already present
  seedDailyEdgeContent().catch((error) => {
    console.error("Failed to seed Daily Edge content:", error);
  });

  // Seed Presentation Training content if not already present
  seedPresentationContent().catch((error) => {
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
      const userId = req.user.claims.sub;
      const membership = req.orgMembership;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      
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
            });
          }
          
          // Link drop to merchant and update merchant stats
          drop = (await storage.updateDrop(drop.id, { merchantId: merchant.id })) || drop;
          await storage.updateMerchant(merchant.id, {
            totalDrops: (merchant.totalDrops || 0) + 1,
            lastVisitAt: new Date(),
          });
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

Please listen to this audio recording and provide:
1. A brief summary (2-3 sentences) of what was discussed in the meeting
2. 3-5 key takeaways or important points from the conversation
3. Overall sentiment of the interaction (positive, neutral, or negative)

If the audio is unclear or you cannot understand it, still provide your best analysis based on what you can hear.

Format your response as JSON:
{
  "summary": "Brief summary of the actual conversation here",
  "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],
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
            aiSummary = parsed.summary || "";
            keyTakeaways = parsed.keyTakeaways || [];
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
      const userId = req.user.claims.sub;
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
      });
    } catch (error) {
      console.error("Error fetching user role:", error);
      res.status(500).json({ error: "Failed to fetch user role" });
    }
  });

  // Update current user's profile
  app.put("/api/me/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        membership = await bootstrapUserOrganization(userId);
      }

      const profileSchema = z.object({
        firstName: z.string().min(1, "First name is required").max(100),
        lastName: z.string().min(1, "Last name is required").max(100),
        email: z.string().email("Invalid email address").max(255),
        phone: z.string().min(10, "Phone number must be at least 10 digits").max(20),
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

  // ============================================
  // USER PERMISSIONS API
  // ============================================

  // Get current user's permissions
  app.get("/api/me/permissions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Get permissions for a specific user (admin only)
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
  // LEADERBOARD API
  // ============================================

  // Get leaderboard - requires canViewLeaderboard permission
  app.get("/api/leaderboard", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = req.orgMembership as OrgMembershipInfo;
      
      // Check permission (admins always have access)
      if (membership.role !== "master_admin") {
        let perms = await storage.getUserPermissions(userId);
        if (!perms) {
          perms = await storage.createUserPermissions(userId);
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
      const invitations = await storage.getInvitationsByOrg(membership.organization.id);
      res.json(invitations);
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
      const { type, subject, message } = req.body;

      const parsed = insertFeedbackSubmissionSchema.safeParse({
        userId,
        userName: req.user.claims.name || req.user.claims.email,
        userEmail: req.user.claims.email,
        type,
        subject,
        message,
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
          subject: `${emailType.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())} - ${businessName}`,
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

  // ============================================
  // MERCHANTS API (Merchant Profiles)
  // ============================================
  
  app.get("/api/merchants", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
        
        // Check if merchant has drops from allowed agents
        const allowedMerchants = await storage.getMerchantsByAgentIds(orgId, allowedAgentIds);
        const hasAccess = allowedMerchants.some(m => m.id === merchantId);
        
        if (!hasAccess) {
          return res.status(403).json({ error: "Access denied" });
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
      const data = { ...req.body, orgId: membership.organization.id };
      
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
      
      const senderName = req.user.claims.name || req.user.claims.email || "BrochureTracker Team";
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
- PayLo dual pricing potential
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
  // ROLE-PLAY COACH API
  // ============================================

  app.post("/api/roleplay/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { dropId, scenario, customObjections, mode = "roleplay", difficulty = "intermediate", persona } = req.body;

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
      let drop = null;

      if (dropId) {
        drop = await storage.getDrop(parseInt(dropId));
        if (drop) {
          businessContext = getBusinessContextPrompt(
            drop.businessType || "other",
            drop.businessName || "",
            drop.textNotes || ""
          );
        }
      }

      if (customObjections) {
        businessContext += `\n\nThe agent wants to practice handling these specific objections: ${customObjections}`;
      }

      const session = await storage.createRoleplaySession({
        agentId: userId,
        dropId: dropId ? parseInt(dropId) : null,
        scenario,
        mode: mode || "roleplay",
        businessContext: `${businessContext}\nDifficulty: ${selectedDifficulty}${persona ? `\nPersona: ${persona}` : ''}`,
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

You're their personal sales coach. Help them succeed!`;
      } else {
        const scenarioPrompt = getScenarioPrompt(scenario, selectedDifficulty as 'beginner' | 'intermediate' | 'advanced', persona);
        systemMessage = `You are playing the role of a business owner in a sales role-play training exercise.

${scenarioPrompt}

${businessContext}
${driveKnowledge ? `\nREFERENCE MATERIALS (use these to create realistic scenarios):\n${driveKnowledge.substring(0, 4000)}` : ''}

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
      });
    } catch (error) {
      console.error("Error creating roleplay session:", error);
      res.status(500).json({ error: "Failed to create roleplay session" });
    }
  });

  // Get available personas for roleplay
  app.get("/api/roleplay/personas", isAuthenticated, async (_req: any, res) => {
    try {
      const personas = Object.entries(ROLEPLAY_PERSONAS).map(([key, value]) => ({
        id: key,
        name: value.name,
        description: value.description,
        difficulty: value.difficulty,
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

      const feedbackPrompt = `You are a sales coach reviewing a role-play practice session. Analyze this conversation between a sales agent and a simulated prospect.

CONVERSATION:
${conversationText}

SALES TRAINING REFERENCE:
${SALES_TRAINING_KNOWLEDGE.substring(0, 4000)}

Provide constructive feedback in JSON format:
{
  "overallScore": <1-100>,
  "strengths": ["strength 1", "strength 2"],
  "areasToImprove": ["area 1", "area 2"],
  "nepqUsage": "Did they use NEPQ questioning techniques? How well?",
  "objectionHandling": "How did they handle objections?",
  "rapportBuilding": "Did they build rapport effectively?",
  "topTip": "One specific actionable tip for their next conversation"
}`;

      const feedbackResponse = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: "You are an expert sales coach. Provide feedback in valid JSON format only." },
          { role: "user", content: feedbackPrompt }
        ],
        max_completion_tokens: 1000,
      });

      const feedbackText = feedbackResponse.choices[0]?.message?.content || "{}";
      
      let feedback;
      try {
        const jsonMatch = feedbackText.match(/\{[\s\S]*\}/);
        feedback = jsonMatch ? JSON.parse(jsonMatch[0]) : { overallScore: 50, topTip: "Keep practicing!" };
      } catch {
        feedback = { overallScore: 50, topTip: "Keep practicing!" };
      }

      const endedAt = new Date();
      await storage.updateRoleplaySession(sessionId, {
        status: "completed",
        endedAt,
        feedback: JSON.stringify(feedback),
        performanceScore: feedback.overallScore || 50,
      });

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
  app.post("/api/equipiq/recommend", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get("/api/equipiq/recommendations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessions = await storage.getEquipmentRecommendationSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("[EquipIQ] Error fetching recommendations:", error);
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  // Get user's quiz results
  app.get("/api/equipiq/quiz-results", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const results = await storage.getEquipmentQuizResults(userId);
      res.json(results);
    } catch (error) {
      console.error("[EquipIQ] Error fetching quiz results:", error);
      res.status(500).json({ error: "Failed to fetch quiz results" });
    }
  });

  // Submit quiz result
  app.post("/api/equipiq/quiz-results", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
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
${SIGNAPAY_SALES_SCRIPT}

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
5. Dual Pricing Details - Deep dive into PayLo
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

  app.post("/api/proposals/parse", isAuthenticated, ensureOrgMembership(), pdfUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "File is required" });
      }

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

  app.post("/api/proposals/generate", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
    try {
      const membership = req.orgMembership as OrgMembershipInfo;
      const userId = req.user.claims.sub;

      const { parsedData, useAI, selectedTerminalId } = req.body;

      if (!parsedData || !parsedData.merchantName) {
        return res.status(400).json({ error: "Parsed proposal data is required" });
      }

      const { generateProposalBlueprint, generateProposalPDF, generateProposalDOCX } = await import("./proposal-generator");

      let equipment: { name: string; features: string[]; whySelected: string } | undefined;
      if (selectedTerminalId) {
        const products = await storage.getEquipmentProducts();
        const terminal = products.find(p => p.id === selectedTerminalId);
        if (terminal) {
          equipment = {
            name: terminal.name,
            features: terminal.features || [],
            whySelected: `Based on your monthly volume of $${parsedData.currentState?.totalVolume?.toLocaleString() || "N/A"}, ${terminal.name} is recommended for its ${terminal.bestFor?.join(", ") || "versatile features"}.`,
          };
        }
      } else {
        const products = await storage.getEquipmentProducts();
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
        }
      }

      let blueprint = await generateProposalBlueprint(parsedData, equipment);

      if (useAI) {
        try {
          const client = getAIIntegrationsClient();
          const aiPrompt = `You are a professional proposal writer for PCBancard, a payment processing company. Based on the following merchant analysis, enhance the proposal content to be more persuasive and professional.

Merchant: ${parsedData.merchantName}
Current Monthly Cost: $${parsedData.currentState?.totalMonthlyCost?.toLocaleString() || "N/A"}
Recommended Option: ${blueprint.savingsComparison.recommendedOption === "dual_pricing" ? "Dual Pricing" : "Interchange Plus"}
Estimated Monthly Savings: $${Math.max(blueprint.savingsComparison.dualPricingSavings || 0, blueprint.savingsComparison.interchangePlusSavings || 0).toLocaleString()}

Generate:
1. A compelling executive summary intro (2-3 sentences)
2. A strong recommendation statement (2-3 sentences)
3. A persuasive call to action (2-3 sentences)

Format your response as JSON:
{
  "intro": "...",
  "recommendation": "...",
  "callToAction": "..."
}`;

          const response = await client.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
              { role: "system", content: "You are a professional B2B sales proposal writer. Be persuasive but professional. Focus on value and savings." },
              { role: "user", content: aiPrompt },
            ],
            max_completion_tokens: 500,
            temperature: 0.7,
          });

          const aiContent = response.choices[0]?.message?.content || "";
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const aiEnhancements = JSON.parse(jsonMatch[0]);
            if (aiEnhancements.intro) blueprint.executiveSummary.intro = aiEnhancements.intro;
            if (aiEnhancements.recommendation) blueprint.executiveSummary.recommendation = aiEnhancements.recommendation;
            if (aiEnhancements.callToAction) blueprint.callToAction = aiEnhancements.callToAction;
          }
        } catch (aiError: any) {
          console.error("[Proposals] AI enhancement failed:", aiError.message);
        }
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
        selectedTerminalId: equipment ? selectedTerminalId : undefined,
        terminalName: equipment?.name,
        terminalFeatures: equipment?.features,
        whySelected: equipment?.whySelected,
        proposalBlueprint: blueprint,
        status: "draft",
      });

      res.json({
        success: true,
        proposal,
        blueprint,
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

      const { generateProposalPDF, generateProposalDOCX, ProposalBlueprint, ParsedProposal } = await import("./proposal-generator");

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

      const { status } = req.body;
      const updateData: any = {};
      if (status && ["draft", "generated", "sent"].includes(status)) {
        updateData.status = status;
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

  return httpServer;
}
