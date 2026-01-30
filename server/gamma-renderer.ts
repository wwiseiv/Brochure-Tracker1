import * as fs from "fs";
import * as path from "path";

const GAMMA_API_KEY = process.env.GAMMA_API_KEY;
const GAMMA_BASE_URL = "https://public-api.gamma.app/v1.0";

export interface GammaGenerationOptions {
  exportAs?: "pdf" | "pptx" | null;
  themeId?: string;
  numCards?: number;
}

export interface GammaGenerationResult {
  success: boolean;
  gammaUrl?: string;
  exportUrl?: string;
  localFilePath?: string;
  creditsUsed?: number;
  creditsRemaining?: number;
  error?: string;
  fallback?: boolean;
  fallbackReason?: string;
}

export interface ProposalBlueprintForGamma {
  cover: {
    headline: string;
    subheadline: string;
    merchantName: string;
    preparedBy: string;
    date: string;
  };
  executiveSummary: {
    opening: string;
    keyFindings: string[];
    recommendation: string;
  };
  currentSituation: {
    narrative: string;
    tableRows: string[][];
    totalMonthly: string;
    effectiveRate: string;
  };
  optionDualPricing?: {
    title: string;
    tagline: string;
    howItWorks: string;
    benefits: string[];
    costs: {
      monthlyProgramFee: string;
      processingCost: string;
      totalMonthly: string;
    };
    savings: {
      monthly: string;
      annual: string;
    };
  };
  optionInterchangePlus?: {
    title: string;
    tagline: string;
    howItWorks: string;
    benefits: string[];
    costs: {
      rate: string;
      perTransaction: string;
      totalMonthly: string;
    };
    savings: {
      monthly: string;
      annual: string;
    };
  };
  comparisonTable?: {
    rows: string[][];
  };
  equipment?: {
    title: string;
    terminalName: string;
    whyRecommended: string;
    features: string[];
  };
  nextSteps: {
    steps: string[];
    ctaPrimary: string;
    ctaSecondary: string;
  };
  disclosures: string[];
  dualPricingExplanation?: string;
  interchangePlusExplanation?: string;
  implementationPlan?: string[];
  whyPCBancard?: string;
  complianceDisclosure?: string;
  images?: {
    heroImage?: string;
    industryImage?: string;
    logoUrl?: string;
  };
}

export class GammaRenderer {
  private apiKey: string;

  constructor() {
    if (!GAMMA_API_KEY) {
      throw new Error("GAMMA_API_KEY not configured");
    }
    this.apiKey = GAMMA_API_KEY;
  }

  async checkAvailability(): Promise<{ available: boolean; credits?: number; error?: string }> {
    try {
      const response = await fetch(`${GAMMA_BASE_URL}/themes`, {
        method: "GET",
        headers: {
          "X-API-KEY": this.apiKey,
        },
      });

      if (!response.ok) {
        return { available: false, error: `API returned ${response.status}` };
      }

      return { available: true };
    } catch (error) {
      return { 
        available: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  async generateProposal(
    blueprint: ProposalBlueprintForGamma,
    options: GammaGenerationOptions = {}
  ): Promise<GammaGenerationResult> {
    const {
      exportAs = "pdf",
      themeId = "Professional",
      numCards = 8,
    } = options;

    try {
      const inputText = this.formatForGamma(blueprint);

      const generationId = await this.startGeneration({
        inputText,
        format: "presentation",
        numCards,
        themeId,
        exportAs,
        cardOptions: {
          dimensions: "16x9",
        },
        contentOptions: {
          textDensity: "medium",
          tone: ["professional", "confident"],
        },
      });

      const result = await this.pollUntilComplete(generationId);

      let localFilePath: string | undefined;
      if (exportAs && result.exportUrl) {
        localFilePath = await this.downloadFile(
          result.exportUrl,
          `proposal-${Date.now()}.${exportAs}`
        );
      }

      return {
        success: true,
        gammaUrl: result.gammaUrl,
        exportUrl: result.exportUrl,
        localFilePath,
        creditsUsed: result.credits?.deducted,
        creditsRemaining: result.credits?.remaining,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private formatForGamma(blueprint: ProposalBlueprintForGamma): string {
    const sections: string[] = [];

    sections.push(`
# ${blueprint.cover.headline}
${blueprint.cover.subheadline}

**Prepared for:** ${blueprint.cover.merchantName}
**Prepared by:** ${blueprint.cover.preparedBy}
**Date:** ${blueprint.cover.date}
    `.trim());

    sections.push(`
# Executive Summary

${blueprint.executiveSummary.opening}

**Key Findings:**
${blueprint.executiveSummary.keyFindings.map((f) => `• ${f}`).join("\n")}

**Recommendation:** ${blueprint.executiveSummary.recommendation}
    `.trim());

    sections.push(`
# Your Current Processing Costs

${blueprint.currentSituation.narrative}

| Card Brand | Volume | Rate | Monthly Cost |
|------------|--------|------|--------------|
${blueprint.currentSituation.tableRows.map((row) => `| ${row.join(" | ")} |`).join("\n")}

**Total Monthly Cost:** ${blueprint.currentSituation.totalMonthly}
**Effective Rate:** ${blueprint.currentSituation.effectiveRate}
    `.trim());

    if (blueprint.optionDualPricing) {
      sections.push(`
# ${blueprint.optionDualPricing.title}

${blueprint.optionDualPricing.tagline}

**How It Works:**
${blueprint.optionDualPricing.howItWorks}

**Benefits:**
${blueprint.optionDualPricing.benefits.map((b) => `• ${b}`).join("\n")}

**Your Cost:**
• Monthly Program Fee: ${blueprint.optionDualPricing.costs.monthlyProgramFee}
• Processing Cost: ${blueprint.optionDualPricing.costs.processingCost}
• **Total Monthly: ${blueprint.optionDualPricing.costs.totalMonthly}**

**Savings:**
• Monthly: ${blueprint.optionDualPricing.savings.monthly}
• Annual: ${blueprint.optionDualPricing.savings.annual}
      `.trim());
    }

    if (blueprint.optionInterchangePlus) {
      sections.push(`
# ${blueprint.optionInterchangePlus.title}

${blueprint.optionInterchangePlus.tagline}

**How It Works:**
${blueprint.optionInterchangePlus.howItWorks}

**Benefits:**
${blueprint.optionInterchangePlus.benefits.map((b) => `• ${b}`).join("\n")}

**Your Cost:**
• Rate: ${blueprint.optionInterchangePlus.costs.rate}
• Per Transaction: ${blueprint.optionInterchangePlus.costs.perTransaction}
• **Total Monthly: ${blueprint.optionInterchangePlus.costs.totalMonthly}**

**Savings:**
• Monthly: ${blueprint.optionInterchangePlus.savings.monthly}
• Annual: ${blueprint.optionInterchangePlus.savings.annual}
      `.trim());
    }

    if (blueprint.comparisonTable) {
      sections.push(`
# Side-by-Side Comparison

| | Current | Dual Pricing | Interchange Plus |
|---|---------|--------------|------------------|
${blueprint.comparisonTable.rows.map((row) => `| ${row.join(" | ")} |`).join("\n")}
      `.trim());
    }

    if (blueprint.equipment) {
      sections.push(`
# ${blueprint.equipment.title}

**${blueprint.equipment.terminalName}**

${blueprint.equipment.whyRecommended}

**Features:**
${blueprint.equipment.features.map((f) => `• ${f}`).join("\n")}
      `.trim());
    }

    if (blueprint.whyPCBancard) {
      sections.push(`
# Why PCBancard?

${blueprint.whyPCBancard}
      `.trim());
    }

    if (blueprint.implementationPlan && blueprint.implementationPlan.length > 0) {
      sections.push(`
# Implementation Plan

${blueprint.implementationPlan.map((step, i) => `${i + 1}. ${step}`).join("\n")}
      `.trim());
    }

    sections.push(`
# Getting Started

${blueprint.nextSteps.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}

**${blueprint.nextSteps.ctaPrimary}**

${blueprint.nextSteps.ctaSecondary}
    `.trim());

    if (blueprint.complianceDisclosure) {
      sections.push(`
# Compliance & Legal

${blueprint.complianceDisclosure}
      `.trim());
    }

    sections.push(`
# Important Disclosures

${blueprint.disclosures.map((d) => `• ${d}`).join("\n")}
    `.trim());

    return sections.join("\n\n---\n\n");
  }

  private async startGeneration(params: {
    inputText: string;
    format: string;
    numCards: number;
    themeId: string;
    exportAs: string | null;
    cardOptions: { dimensions: string };
    contentOptions: { textDensity: string; tone: string[] };
  }): Promise<string> {
    const response = await fetch(`${GAMMA_BASE_URL}/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": this.apiKey,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Gamma API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  private async pollUntilComplete(
    generationId: string,
    maxAttempts = 60,
    intervalMs = 2000
  ): Promise<{
    gammaUrl?: string;
    exportUrl?: string;
    credits?: { deducted?: number; remaining?: number };
  }> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`${GAMMA_BASE_URL}/generations/${generationId}`, {
        method: "GET",
        headers: {
          "X-API-KEY": this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check generation status: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === "completed") {
        return {
          gammaUrl: data.url,
          exportUrl: data.exportUrl,
          credits: data.credits,
        };
      }

      if (data.status === "failed") {
        throw new Error(`Generation failed: ${data.error || "Unknown error"}`);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error("Generation timed out");
  }

  private async downloadFile(url: string, filename: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const uploadsDir = path.join(process.cwd(), "uploads", "proposals");
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, Buffer.from(buffer));

    return filePath;
  }
}

export function isGammaConfigured(): boolean {
  return !!GAMMA_API_KEY;
}

export function createGammaRenderer(): GammaRenderer | null {
  if (!GAMMA_API_KEY) {
    return null;
  }
  return new GammaRenderer();
}
