import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { requireRole, requireOrgAccess, ensureOrgMembership, bootstrapUserOrganization } from "./rbac";
import { insertDropSchema, insertBrochureSchema, insertReminderSchema, updateUserPreferencesSchema, ORG_MEMBER_ROLES, insertOrganizationMemberSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

// Configure multer for file uploads (in-memory storage for audio files)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    // Only allow audio files
    const allowedMimeTypes = [
      "audio/wav",
      "audio/mpeg",
      "audio/mp4",
      "audio/webm",
      "audio/m4a",
      "audio/ogg",
      "audio/flac"
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication first
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Setup object storage routes
  registerObjectStorageRoutes(app);

  // Brochures API
  app.post("/api/brochures", isAuthenticated, async (req: any, res) => {
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

  // Drops API
  app.get("/api/drops", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let drops = await storage.getDropsByAgent(userId);
      
      // Seed demo data for new users with no drops
      if (drops.length === 0) {
        console.log(`Seeding demo data for new user: ${userId}`);
        await storage.seedDemoData(userId);
        drops = await storage.getDropsByAgent(userId);
      }
      
      res.json(drops);
    } catch (error) {
      console.error("Error fetching drops:", error);
      res.status(500).json({ error: "Failed to fetch drops" });
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

  app.post("/api/drops", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if brochure exists, create if not
      const brochureId = req.body.brochureId;
      let brochure = await storage.getBrochure(brochureId);
      
      if (!brochure) {
        // Auto-create brochure if it doesn't exist
        brochure = await storage.createBrochure({
          id: brochureId,
          status: "deployed",
        });
      } else {
        // Update brochure status to deployed
        await storage.updateBrochureStatus(brochureId, "deployed");
      }
      
      // Create the drop with validation
      const dropData = {
        ...req.body,
        agentId: userId,
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
      
      res.status(201).json(drop);
    } catch (error) {
      console.error("Error creating drop:", error);
      res.status(500).json({ error: "Failed to create drop" });
    }
  });

  app.patch("/api/drops/:id", isAuthenticated, async (req: any, res) => {
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

  // Voice transcription endpoint with OpenAI Whisper
  app.post(
    "/api/transcribe",
    isAuthenticated,
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

        // Verify OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY && !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
          console.error("OpenAI API key not configured");
          return res.status(500).json({ 
            error: "Audio transcription service is not available",
            details: [{ 
              field: "server", 
              message: "OpenAI API key is not configured" 
            }]
          });
        }

        // Create a temporary file path for the audio
        const tempFilePath = path.join("/tmp", `${Date.now()}_${req.file.originalname}`);
        
        // Write the file to disk temporarily (required by OpenAI client)
        await new Promise((resolve, reject) => {
          fs.writeFile(tempFilePath, req.file.buffer, (err) => {
            if (err) reject(err);
            else resolve(null);
          });
        });

        try {
          // Call OpenAI Whisper API for transcription
          // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
          const client = getOpenAIClient();
          const transcription = await client.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: "whisper-1",
          });

          // Clean up temporary file
          fs.unlink(tempFilePath, (err) => {
            if (err) console.error("Error deleting temp file:", err);
          });

          // Return the transcribed text
          res.json({
            text: transcription.text,
            duration: transcription.duration || 0,
          });
        } catch (openaiError: any) {
          // Clean up temporary file on error
          fs.unlink(tempFilePath, (err) => {
            if (err) console.error("Error deleting temp file:", err);
          });

          console.error("OpenAI Whisper API error:", openaiError);
          
          // Handle specific OpenAI errors
          if (openaiError.status === 401) {
            return res.status(500).json({ 
              error: "Authentication failed with OpenAI API",
              details: [{ field: "server", message: "Invalid API credentials" }]
            });
          }
          if (openaiError.status === 429) {
            return res.status(429).json({ 
              error: "Rate limit exceeded",
              details: [{ field: "server", message: "Too many requests to transcription service" }]
            });
          }
          
          throw openaiError;
        }
      } catch (error) {
        console.error("Error transcribing audio:", error);
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
      });
    } catch (error) {
      console.error("Error fetching user role:", error);
      res.status(500).json({ error: "Failed to fetch user role" });
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

  return httpServer;
}
