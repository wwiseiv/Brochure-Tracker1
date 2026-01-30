import { Router } from "express";
import { initializeProposalIntelligence, orchestrator, modelRouter, pluginManager } from "./index";
import type { ProposalRequest } from "./core/orchestrator";
import { isAuthenticated } from "../replit_integrations/auth";
import { ensureOrgMembership } from "../rbac";
import { z } from "zod";

const router = Router();

initializeProposalIntelligence();

const generateProposalSchema = z.object({
  merchantData: z.object({
    businessName: z.string().min(1, "Business name is required"),
    ownerName: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    website: z.string().optional(),
    address: z.string().optional(),
    industry: z.string().optional(),
    monthlyVolume: z.number().optional(),
    averageTicket: z.number().optional(),
    repNotes: z.string().optional()
  }),
  salesperson: z.object({
    name: z.string(),
    title: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    photoUrl: z.string().optional()
  }).optional(),
  outputFormat: z.enum(["pdf", "docx", "html"]).optional()
});

router.post("/generate", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
  try {
    const parsed = generateProposalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.format() 
      });
    }

    const { merchantData, salesperson, outputFormat } = parsed.data;
    const userId = req.user?.claims?.sub || "anonymous";
    const membership = req.orgMembership;

    const request: ProposalRequest = {
      userId,
      organizationId: membership?.organization?.id || 1,
      merchantData: {
        businessName: merchantData.businessName,
        ownerName: merchantData.ownerName,
        email: merchantData.email || undefined,
        phone: merchantData.phone,
        website: merchantData.website,
        address: merchantData.address,
        industry: merchantData.industry,
        monthlyVolume: merchantData.monthlyVolume,
        averageTicket: merchantData.averageTicket,
        repNotes: merchantData.repNotes
      },
      salesperson: salesperson || {
        name: "PCBancard Representative",
        title: "Account Executive"
      },
      outputFormat: outputFormat || "pdf"
    };

    console.log(`[ProposalAPI] Generating proposal for: ${merchantData.businessName}`);
    const context = await orchestrator.execute(request);

    res.json({
      success: context.stage === "complete",
      proposalId: context.id,
      stage: context.stage,
      merchantData: context.merchantData,
      enrichedData: context.enrichedData,
      proposalContent: (context as any).proposalContent,
      audit: context.audit,
      citations: context.citations,
      errors: context.errors,
      warnings: context.warnings
    });

  } catch (error) {
    console.error("[ProposalAPI] Error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Proposal generation failed" 
    });
  }
});

router.get("/status", (req, res) => {
  const plugins = pluginManager.getAllPlugins();
  const providers = modelRouter.getAvailableProviders();

  res.json({
    status: "operational",
    version: "1.0.0",
    plugins: plugins.map(p => ({
      id: p.id,
      name: p.name,
      version: p.version,
      stage: p.stage,
      enabled: p.enabled
    })),
    availableProviders: providers,
    capabilities: {
      validation: pluginManager.isEnabled("field-validation"),
      webScraping: pluginManager.isEnabled("web-scraper"),
      aiGeneration: pluginManager.isEnabled("proposal-generator")
    }
  });
});

router.post("/plugins/:pluginId/toggle", isAuthenticated, ensureOrgMembership(), (req: any, res) => {
  const { pluginId } = req.params;
  const { enabled } = req.body;

  const plugin = pluginManager.getPlugin(pluginId);
  if (!plugin) {
    return res.status(404).json({ error: "Plugin not found" });
  }

  pluginManager.setEnabled(pluginId, enabled);
  
  res.json({
    pluginId,
    enabled: pluginManager.isEnabled(pluginId)
  });
});

router.post("/test-model", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
  try {
    const { prompt, provider, taskType } = req.body;

    const response = await modelRouter.route({
      type: taskType || "general",
      prompt: prompt || "Say hello in one sentence."
    }, provider);

    res.json({
      success: true,
      response: response.content,
      model: response.model,
      provider: response.provider,
      latencyMs: response.latencyMs
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Model test failed" 
    });
  }
});

export default router;
