import { Router } from "express";
import { initializeProposalIntelligence, orchestrator, modelRouter, pluginManager } from "./index";
import type { ProposalRequest } from "./core/orchestrator";
import { isAuthenticated } from "../replit_integrations/auth";
import { ensureOrgMembership, requireRole } from "../rbac";
import { z } from "zod";
import { analyzeStatement, type StatementData } from "./services/statement-analysis";
import { generateTalkingPoints, generateCompetitorInsights } from "./services/talking-points";
import { getAIStatementAnalysis, generateProposalContent } from "./services/ai-analyzer";
import { extractStatementFromFiles } from "./services/statement-extractor";

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

router.post("/plugins/:pluginId/toggle", isAuthenticated, ensureOrgMembership(), requireRole("master_admin"), (req: any, res) => {
  const { pluginId } = req.params;
  const { enabled } = req.body;

  const plugin = pluginManager.getPlugin(pluginId);
  if (!plugin) {
    return res.status(404).json({ error: "Plugin not found" });
  }

  pluginManager.setEnabled(pluginId, enabled);
  
  console.log(`[ProposalAPI] Plugin ${pluginId} ${enabled ? 'enabled' : 'disabled'} by admin ${req.user?.claims?.sub}`);
  
  res.json({
    pluginId,
    enabled: pluginManager.isEnabled(pluginId)
  });
});

router.post("/test-model", isAuthenticated, ensureOrgMembership(), requireRole("master_admin"), async (req: any, res) => {
  try {
    const { prompt, provider, taskType } = req.body;

    console.log(`[ProposalAPI] Model test initiated by admin ${req.user?.claims?.sub}`);
    
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

import { calculateInterchange, calculateSavings } from "./plugins/interchange-calculator";
import { 
  getAllRates, 
  ASSESSMENT_FEES, 
  AVERAGE_RATES_BY_CATEGORY,
  DUAL_PRICING_INFO 
} from "./data/interchange-rates";

router.post("/calculate-interchange", isAuthenticated, ensureOrgMembership(), (req: any, res) => {
  try {
    const { 
      monthlyVolume = 50000, 
      averageTicket = 50, 
      category = "retail", 
      isCardPresent = true 
    } = req.body;

    const calculation = calculateInterchange(
      monthlyVolume, 
      averageTicket, 
      category, 
      isCardPresent
    );

    res.json({
      success: true,
      calculation,
      dualPricingInfo: DUAL_PRICING_INFO
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Calculation failed" 
    });
  }
});

router.post("/calculate-savings", isAuthenticated, ensureOrgMembership(), (req: any, res) => {
  try {
    const { 
      currentEffectiveRate, 
      monthlyVolume, 
      proposedProgram = "dual_pricing" 
    } = req.body;

    if (!currentEffectiveRate || !monthlyVolume) {
      return res.status(400).json({ 
        error: "Missing required fields: currentEffectiveRate, monthlyVolume" 
      });
    }

    const savings = calculateSavings(currentEffectiveRate, monthlyVolume, proposedProgram);

    res.json({
      success: true,
      savings,
      comparison: {
        currentMonthlyCost: (monthlyVolume * currentEffectiveRate / 100).toFixed(2),
        proposedMonthlyCost: (monthlyVolume * savings.proposedRate / 100).toFixed(2),
        proposedProgram
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Calculation failed" 
    });
  }
});

router.get("/interchange-rates", (req, res) => {
  res.json({
    rates: getAllRates(),
    assessmentFees: ASSESSMENT_FEES,
    averageRatesByCategory: AVERAGE_RATES_BY_CATEGORY,
    dualPricingInfo: DUAL_PRICING_INFO,
    lastUpdated: "2025-04-11",
    sources: [
      "Visa USA Interchange Reimbursement Fees (October 2025)",
      "Mastercard U.S. Region Interchange Programs (April 2025)",
      "Discover Interchange Program Guide (April 2025)",
      "American Express OptBlue Pricing Guide (April 2025)"
    ]
  });
});

const statementAnalysisSchema = z.object({
  processorName: z.string().optional(),
  merchantName: z.string().optional(),
  totalVolume: z.number().min(1, "Monthly volume is required"),
  totalTransactions: z.number().min(1, "Transaction count is required"),
  averageTicket: z.number().optional(),
  totalFees: z.number().min(0, "Total fees is required"),
  merchantType: z.enum(["retail", "restaurant", "qsr", "supermarket", "ecommerce", "service", "lodging", "healthcare", "b2b", "government", "education"]).optional(),
  fees: z.object({
    interchange: z.number().optional(),
    assessments: z.number().optional(),
    processorMarkup: z.number().optional(),
    monthlyFees: z.number().optional(),
    pciFees: z.number().optional(),
    equipmentFees: z.number().optional(),
    otherFees: z.number().optional(),
    annual: z.number().optional()
  }).optional(),
  cardMix: z.object({
    visa: z.object({ volume: z.number(), transactions: z.number() }).optional(),
    mastercard: z.object({ volume: z.number(), transactions: z.number() }).optional(),
    discover: z.object({ volume: z.number(), transactions: z.number() }).optional(),
    amex: z.object({ volume: z.number(), transactions: z.number() }).optional(),
    debit: z.object({ volume: z.number(), transactions: z.number() }).optional()
  }).optional(),
  qualificationBreakdown: z.object({
    qualified: z.object({ volume: z.number(), rate: z.number() }).optional(),
    midQualified: z.object({ volume: z.number(), rate: z.number() }).optional(),
    nonQualified: z.object({ volume: z.number(), rate: z.number() }).optional()
  }).optional(),
  useAI: z.boolean().optional(),
  icPlusMargin: z.object({
    ratePercent: z.number().min(0).max(5).default(0.50),
    perTxnFee: z.number().min(0).max(1).default(0.10),
    monthlyFee: z.number().min(0).max(100).default(10)
  }).optional(),
  dualPricingMonthlyCost: z.number().min(0).max(500).default(64.95).optional()
});

router.post("/analyze-statement", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
  try {
    const parsed = statementAnalysisSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.format() 
      });
    }

    const data = parsed.data;
    
    const statementData: StatementData = {
      processorName: data.processorName,
      merchantName: data.merchantName,
      totalVolume: data.totalVolume,
      totalTransactions: data.totalTransactions,
      averageTicket: data.averageTicket,
      merchantType: data.merchantType || "retail",
      fees: {
        ...data.fees,
        totalFees: data.totalFees
      },
      cardMix: data.cardMix,
      qualificationBreakdown: data.qualificationBreakdown
    };

    const icPlusMargin = data.icPlusMargin || {
      ratePercent: 0.50,
      perTxnFee: 0.10,
      monthlyFee: 10
    };

    const dualPricingMonthlyCost = data.dualPricingMonthlyCost || 64.95;

    const analysis = analyzeStatement(statementData, icPlusMargin, dualPricingMonthlyCost);
    const talkingPoints = generateTalkingPoints(analysis);
    
    let competitorInsights = null;
    if (data.processorName) {
      competitorInsights = generateCompetitorInsights(data.processorName);
    }

    let aiAnalysis = null;
    if (data.useAI) {
      try {
        aiAnalysis = await getAIStatementAnalysis(statementData, analysis, talkingPoints);
      } catch (error) {
        console.error("[StatementAnalysis] AI analysis failed:", error);
      }
    }

    res.json({
      success: true,
      analysis,
      talkingPoints,
      competitorInsights,
      aiAnalysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[StatementAnalysis] Error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Analysis failed" 
    });
  }
});

router.post("/quick-analysis", isAuthenticated, ensureOrgMembership(), (req: any, res) => {
  try {
    const { totalVolume, totalTransactions, totalFees, merchantType = "retail" } = req.body;

    if (!totalVolume || !totalTransactions || totalFees === undefined) {
      return res.status(400).json({ 
        error: "Required: totalVolume, totalTransactions, totalFees" 
      });
    }

    const statementData: StatementData = {
      totalVolume,
      totalTransactions,
      merchantType,
      fees: { totalFees }
    };

    const analysis = analyzeStatement(statementData);
    const talkingPoints = generateTalkingPoints(analysis);

    res.json({
      success: true,
      summary: analysis.summary,
      costAnalysis: analysis.costAnalysis,
      savings: analysis.savings,
      redFlags: analysis.redFlags,
      keyTalkingPoints: {
        opening: talkingPoints.opening,
        dualPricingPitch: talkingPoints.dualPricingPitch,
        closing: talkingPoints.closing
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Quick analysis failed" 
    });
  }
});

router.get("/competitor-insights/:processorName", isAuthenticated, (req: any, res) => {
  const { processorName } = req.params;
  
  if (!processorName) {
    return res.status(400).json({ error: "Processor name is required" });
  }

  const insights = generateCompetitorInsights(processorName);
  res.json({ processorName, insights });
});

const extractStatementSchema = z.object({
  files: z.array(z.object({
    path: z.string(),
    mimeType: z.string(),
    name: z.string()
  })).min(1, "At least one file is required")
});

router.post("/extract-statement", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
  try {
    const parsed = extractStatementSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.format() 
      });
    }

    const { files } = parsed.data;
    
    const privateDir = process.env.PRIVATE_OBJECT_DIR || "";
    for (const file of files) {
      if (!file.path.startsWith("/objects/uploads/") && !file.path.includes(privateDir)) {
        return res.status(403).json({ 
          error: "Access denied: Invalid file path" 
        });
      }
    }
    
    console.log(`[StatementExtractor] Processing ${files.length} files for extraction`);

    const extracted = await extractStatementFromFiles(files);

    res.json({
      success: true,
      extracted,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[StatementExtractor] Error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Extraction failed" 
    });
  }
});

export default router;
