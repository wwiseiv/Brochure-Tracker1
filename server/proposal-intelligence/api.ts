import { Router } from "express";
import { initializeProposalIntelligence, orchestrator, modelRouter, pluginManager } from "./index";
import type { ProposalRequest } from "./core/orchestrator";
import { isAuthenticated } from "../replit_integrations/auth";
import { ensureOrgMembership, requireRole } from "../rbac";
import { z } from "zod";
import { analyzeStatement, type StatementData } from "./services/statement-analysis";
import { generateTalkingPoints, generateCompetitorInsights } from "./services/talking-points";
import { getAIStatementAnalysis, generateProposalContent } from "./services/ai-analyzer";
import { extractStatementFromFiles, extractStatementWithLearning } from "./services/statement-extractor";

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
  dualPricingMonthlyCost: z.number().min(0).max(500).default(64.95).optional(),
  pricingConfig: z.object({
    pricingModel: z.enum(['dual_pricing', 'interchange_plus', 'surcharge']).default('dual_pricing'),
    dualPricing: z.object({
      customerFeePercent: z.number().min(0).max(10).default(3.99),
      monthlyFee: z.number().min(0).max(500).default(64.95)
    }).optional(),
    interchangePlus: z.object({
      markupPercent: z.number().min(0).max(5).default(0.60),
      perTransaction: z.number().min(0).max(1).default(0.12),
      monthlyFee: z.number().min(0).max(100).default(9.95)
    }).optional(),
    surcharge: z.object({
      rate: z.number().min(0).max(3).default(3.00)
    }).optional()
  }).optional()
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

    const dualPricingMonthlyCost = data.pricingConfig?.dualPricing?.monthlyFee ?? data.dualPricingMonthlyCost ?? 64.95;

    const pricingConfigForAnalysis = data.pricingConfig ? {
      pricingModel: data.pricingConfig.pricingModel,
      dualPricing: {
        customerFeePercent: data.pricingConfig.dualPricing?.customerFeePercent ?? 3.99,
        monthlyFee: data.pricingConfig.dualPricing?.monthlyFee ?? 64.95
      },
      interchangePlus: {
        markupPercent: data.pricingConfig.interchangePlus?.markupPercent ?? 0.60,
        perTransaction: data.pricingConfig.interchangePlus?.perTransaction ?? 0.12,
        monthlyFee: data.pricingConfig.interchangePlus?.monthlyFee ?? 9.95
      },
      surcharge: {
        rate: data.pricingConfig.surcharge?.rate ?? 3.00
      }
    } : undefined;

    const analysis = analyzeStatement(statementData, icPlusMargin, dualPricingMonthlyCost, pricingConfigForAnalysis);
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

    const orgId = req.orgMember?.orgId;
    const extracted = await extractStatementWithLearning(files, orgId);

    res.json({
      success: true,
      extracted,
      extractionId: extracted.extractionId,
      processorIdentified: extracted.processorIdentified,
      processorConfidence: extracted.processorConfidence,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[StatementExtractor] Error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Extraction failed" 
    });
  }
});

const statementDocxSchema = z.object({
  merchantName: z.string().min(1),
  processorName: z.string().optional(),
  analysis: z.object({
    summary: z.object({
      monthlyVolume: z.number(),
      monthlyTransactions: z.number(),
      averageTicket: z.number(),
      currentTotalFees: z.number(),
      currentEffectiveRate: z.number()
    }),
    costAnalysis: z.object({
      trueInterchange: z.number(),
      trueAssessments: z.number(),
      trueWholesale: z.number(),
      trueWholesaleRate: z.number(),
      processorMarkup: z.number(),
      processorMarkupRate: z.number()
    }),
    savings: z.object({
      dualPricing: z.object({
        monthlyCost: z.number(),
        monthlySavings: z.number(),
        annualSavings: z.number(),
        effectiveRate: z.number()
      }),
      interchangePlus: z.object({
        monthlyCost: z.number(),
        monthlySavings: z.number(),
        annualSavings: z.number(),
        effectiveRate: z.number()
      })
    }),
    redFlags: z.array(z.object({
      severity: z.string(),
      issue: z.string(),
      detail: z.string(),
      savings: z.number(),
      category: z.string().optional()
    })).optional(),
    aiInsights: z.any().optional(),
    talkingPoints: z.any().optional(),
    competitorInsights: z.any().optional()
  }),
  documentType: z.enum(["agent", "merchant"])
});

router.post("/statement-docx", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
  try {
    const parsed = statementDocxSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.format()
      });
    }

    const { merchantName, processorName, analysis, documentType } = parsed.data;
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, TableLayoutType } = await import("docx");

    const formatCurrency = (val: number) => `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const purpleColor = "7C5CFC";

    const tableBorders = {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    };

    const createTableCell = (text: string, options?: { bold?: boolean; color?: string; width?: number }) => {
      return new TableCell({
        children: [new Paragraph({ 
          children: [new TextRun({ 
            text, 
            bold: options?.bold || false, 
            color: options?.color,
            size: 22
          })] 
        })],
        width: options?.width ? { size: options.width, type: WidthType.PERCENTAGE } : { size: 50, type: WidthType.PERCENTAGE },
        borders: tableBorders,
        margins: { top: 50, bottom: 50, left: 100, right: 100 }
      });
    };

    const children: any[] = [];

    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Statement Analysis Report", bold: true, size: 36, color: purpleColor })],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: `Merchant: ${merchantName}`, size: 24 })],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [new TextRun({ text: `Current Processor: ${processorName || "Unknown"}`, size: 24, color: "666666" })],
        spacing: { after: 300 }
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Current Processing Summary", bold: true, size: 28, color: purpleColor })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 150 }
      })
    );

    const summaryTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      columnWidths: [5000, 4000],
      rows: [
        new TableRow({ children: [createTableCell("Monthly Volume", { width: 55 }), createTableCell(formatCurrency(analysis.summary.monthlyVolume), { bold: true, width: 45 })] }),
        new TableRow({ children: [createTableCell("Monthly Transactions", { width: 55 }), createTableCell(analysis.summary.monthlyTransactions.toLocaleString(), { bold: true, width: 45 })] }),
        new TableRow({ children: [createTableCell("Average Ticket", { width: 55 }), createTableCell(formatCurrency(analysis.summary.averageTicket), { bold: true, width: 45 })] }),
        new TableRow({ children: [createTableCell("Current Total Fees", { width: 55 }), createTableCell(formatCurrency(analysis.summary.currentTotalFees), { bold: true, color: "DC2626", width: 45 })] }),
        new TableRow({ children: [createTableCell("Current Effective Rate", { width: 55 }), createTableCell(`${analysis.summary.currentEffectiveRate}%`, { bold: true, color: "DC2626", width: 45 })] })
      ]
    });
    children.push(summaryTable);

    children.push(
      new Paragraph({
        children: [new TextRun({ text: "True Cost Breakdown", bold: true, size: 28, color: purpleColor })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 }
      })
    );

    const costTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      columnWidths: [5000, 4000],
      rows: [
        new TableRow({ children: [createTableCell("True Interchange", { width: 55 }), createTableCell(formatCurrency(analysis.costAnalysis.trueInterchange), { width: 45 })] }),
        new TableRow({ children: [createTableCell("Card Brand Assessments", { width: 55 }), createTableCell(formatCurrency(analysis.costAnalysis.trueAssessments), { width: 45 })] }),
        new TableRow({ children: [createTableCell("True Wholesale Cost", { width: 55 }), createTableCell(formatCurrency(analysis.costAnalysis.trueWholesale), { color: "16A34A", width: 45 })] }),
        new TableRow({ children: [createTableCell("Processor Markup", { width: 55 }), createTableCell(`${formatCurrency(analysis.costAnalysis.processorMarkup)} (${analysis.costAnalysis.processorMarkupRate}%)`, { color: "DC2626", width: 45 })] })
      ]
    });
    children.push(costTable);

    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Savings Opportunities", bold: true, size: 28, color: purpleColor })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 }
      }),
      new Paragraph({
        children: [new TextRun({ text: "Option 1: Dual Pricing", bold: true, size: 24 })],
        spacing: { after: 100 }
      })
    );

    const dpTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      columnWidths: [5000, 4000],
      rows: [
        new TableRow({ children: [createTableCell("New Monthly Cost", { width: 55 }), createTableCell(formatCurrency(analysis.savings.dualPricing.monthlyCost), { width: 45 })] }),
        new TableRow({ children: [createTableCell("Monthly Savings", { width: 55 }), createTableCell(formatCurrency(analysis.savings.dualPricing.monthlySavings), { bold: true, color: "16A34A", width: 45 })] }),
        new TableRow({ children: [createTableCell("Annual Savings", { width: 55 }), createTableCell(formatCurrency(analysis.savings.dualPricing.annualSavings), { bold: true, color: "16A34A", width: 45 })] }),
        new TableRow({ children: [createTableCell("New Effective Rate", { width: 55 }), createTableCell(`${analysis.savings.dualPricing.effectiveRate}%`, { width: 45 })] })
      ]
    });
    children.push(dpTable);

    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Option 2: Interchange Plus", bold: true, size: 24 })],
        spacing: { before: 200, after: 100 }
      })
    );

    const icpTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      columnWidths: [5000, 4000],
      rows: [
        new TableRow({ children: [createTableCell("New Monthly Cost", { width: 55 }), createTableCell(formatCurrency(analysis.savings.interchangePlus.monthlyCost), { width: 45 })] }),
        new TableRow({ children: [createTableCell("Monthly Savings", { width: 55 }), createTableCell(formatCurrency(analysis.savings.interchangePlus.monthlySavings), { bold: true, color: "16A34A", width: 45 })] }),
        new TableRow({ children: [createTableCell("Annual Savings", { width: 55 }), createTableCell(formatCurrency(analysis.savings.interchangePlus.annualSavings), { bold: true, color: "16A34A", width: 45 })] }),
        new TableRow({ children: [createTableCell("New Effective Rate", { width: 55 }), createTableCell(`${analysis.savings.interchangePlus.effectiveRate}%`, { width: 45 })] })
      ]
    });
    children.push(icpTable);

    if (documentType === "agent" && analysis.redFlags && analysis.redFlags.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Issues Found (Agent Only)", bold: true, size: 28, color: "DC2626" })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 }
        })
      );

      for (const flag of analysis.redFlags) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `[${flag.severity.toUpperCase()}] ${flag.issue}`, bold: true })],
            spacing: { after: 50 }
          }),
          new Paragraph({
            children: [new TextRun({ text: `  ${flag.detail}`, italics: true, color: "666666" })],
            spacing: { after: 50 }
          }),
          new Paragraph({
            children: [new TextRun({ text: `  Potential Monthly Savings: ${formatCurrency(flag.savings)}`, color: "16A34A" })],
            spacing: { after: 150 }
          })
        );
      }
    }

    if (documentType === "agent" && analysis.talkingPoints) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Sales Talking Points (Agent Only)", bold: true, size: 28, color: purpleColor })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 }
        })
      );

      const points = analysis.talkingPoints;
      if (points.opening) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Opening Statement:", bold: true })],
            spacing: { after: 50 }
          }),
          new Paragraph({
            children: [new TextRun({ text: points.opening, italics: true })],
            spacing: { after: 150 }
          })
        );
      }
      if (points.dualPricingPitch) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Dual Pricing Pitch:", bold: true })],
            spacing: { after: 50 }
          }),
          new Paragraph({
            children: [new TextRun({ text: points.dualPricingPitch, italics: true })],
            spacing: { after: 150 }
          })
        );
      }
      if (points.interchangePlusPitch) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Interchange Plus Pitch:", bold: true })],
            spacing: { after: 50 }
          }),
          new Paragraph({
            children: [new TextRun({ text: points.interchangePlusPitch, italics: true })],
            spacing: { after: 150 }
          })
        );
      }
      if (points.closingStatement || points.closing) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Closing Statement:", bold: true })],
            spacing: { after: 50 }
          }),
          new Paragraph({
            children: [new TextRun({ text: points.closingStatement || points.closing, italics: true })],
            spacing: { after: 150 }
          })
        );
      }
    }

    if (documentType === "agent" && analysis.aiInsights) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "AI Insights (Agent Only)", bold: true, size: 28, color: purpleColor })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 }
        })
      );

      const ai = analysis.aiInsights;
      if (ai.statementSummary) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Statement Summary:", bold: true })],
            spacing: { after: 50 }
          }),
          new Paragraph({
            children: [new TextRun({ text: ai.statementSummary })],
            spacing: { after: 150 }
          })
        );
      }
      if (ai.customTalkingPoints && ai.customTalkingPoints.length > 0) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Custom Talking Points:", bold: true })],
            spacing: { after: 50 }
          })
        );
        for (const point of ai.customTalkingPoints) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `• ${point}` })],
              spacing: { after: 30 }
            })
          );
        }
      }
      if (ai.personalizedClosing) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Personalized Closing:", bold: true })],
            spacing: { before: 100, after: 50 }
          }),
          new Paragraph({
            children: [new TextRun({ text: ai.personalizedClosing, italics: true })],
            spacing: { after: 150 }
          })
        );
      }
    }

    if (documentType === "agent" && analysis.competitorInsights) {
      const comp = analysis.competitorInsights;
      const hasContent = (comp.knownIssues?.length > 0) || (comp.contractPitfalls?.length > 0) || (comp.talkingPoints?.length > 0);
      
      if (hasContent) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Competitor Intelligence (Agent Only)", bold: true, size: 28, color: purpleColor })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 }
          })
        );

        if (comp.knownIssues && comp.knownIssues.length > 0) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: "Known Issues with Current Processor:", bold: true })],
              spacing: { after: 50 }
            })
          );
          for (const issue of comp.knownIssues) {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: `• ${issue}` })],
                spacing: { after: 30 }
              })
            );
          }
        }
        if (comp.contractPitfalls && comp.contractPitfalls.length > 0) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: "Contract Pitfalls:", bold: true })],
              spacing: { before: 100, after: 50 }
            })
          );
          for (const pitfall of comp.contractPitfalls) {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: `• ${pitfall}` })],
                spacing: { after: 30 }
              })
            );
          }
        }
        if (comp.talkingPoints && comp.talkingPoints.length > 0) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: "Competitive Advantages:", bold: true })],
              spacing: { before: 100, after: 50 }
            })
          );
          for (const point of comp.talkingPoints) {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: `• ${point}` })],
                spacing: { after: 30 }
              })
            );
          }
        }
      }
    }

    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Generated by PCBancard Statement Analyzer • ${new Date().toLocaleDateString()}`, size: 18, color: "999999" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 }
      })
    );

    const doc = new Document({
      sections: [{ children }]
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = `${merchantName.replace(/[^a-zA-Z0-9]/g, "_")}_Statement_Analysis_${documentType}.docx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buffer);

  } catch (error) {
    console.error("[StatementDocx] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Document generation failed"
    });
  }
});

// ==================== LEARNING SYSTEM ENDPOINTS ====================

import {
  storeExtraction,
  findSimilarExtractions,
  getExtractionStats,
  recordCorrection,
  getFeeDictionary,
  lookupFee,
  seedFeeDictionary,
  identifyProcessor
} from "./services/learning-service";

seedFeeDictionary().catch(err => console.error("[LearningService] Failed to seed fee dictionary:", err));

router.get("/learning/stats", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
  try {
    const stats = await getExtractionStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error("[Learning] Stats error:", error);
    res.status(500).json({ error: "Failed to get learning stats" });
  }
});

router.get("/learning/fees", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
  try {
    const fees = await getFeeDictionary();
    res.json({ success: true, fees });
  } catch (error) {
    console.error("[Learning] Fee dictionary error:", error);
    res.status(500).json({ error: "Failed to get fee dictionary" });
  }
});

router.get("/learning/fees/:name", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
  try {
    const fee = await lookupFee(req.params.name);
    if (!fee) {
      return res.status(404).json({ error: "Fee not found" });
    }
    res.json({ success: true, fee });
  } catch (error) {
    console.error("[Learning] Fee lookup error:", error);
    res.status(500).json({ error: "Failed to lookup fee" });
  }
});

router.post("/learning/extractions/:id/correct", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
  try {
    const extractionId = parseInt(req.params.id);
    const { fieldName, originalValue, correctedValue } = req.body;

    if (!fieldName || correctedValue === undefined) {
      return res.status(400).json({ error: "fieldName and correctedValue are required" });
    }

    await recordCorrection({
      extractionId,
      fieldName,
      originalValue: String(originalValue || ''),
      correctedValue: String(correctedValue),
      userId: req.user?.claims?.sub,
      orgId: req.orgMember?.orgId
    });

    res.json({ success: true, message: "Correction recorded - thank you for improving our accuracy!" });
  } catch (error) {
    console.error("[Learning] Correction error:", error);
    res.status(500).json({ error: "Failed to record correction" });
  }
});

router.post("/learning/extractions/:id/verify", isAuthenticated, ensureOrgMembership(), async (req: any, res) => {
  try {
    const extractionId = parseInt(req.params.id);

    await recordCorrection({
      extractionId,
      fieldName: '_verified',
      originalValue: 'unverified',
      correctedValue: 'verified',
      userId: req.user?.claims?.sub,
      orgId: req.orgMember?.orgId,
      isPositiveFeedback: true
    });

    res.json({ success: true, message: "Thank you for verifying this extraction!" });
  } catch (error) {
    console.error("[Learning] Verification error:", error);
    res.status(500).json({ error: "Failed to record verification" });
  }
});

router.post("/learning/identify-processor", isAuthenticated, ensureOrgMembership(), (req: any, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }
    const result = identifyProcessor(text);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("[Learning] Processor identification error:", error);
    res.status(500).json({ error: "Failed to identify processor" });
  }
});

export default router;
