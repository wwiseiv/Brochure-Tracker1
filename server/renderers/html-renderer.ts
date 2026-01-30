import * as fs from "fs";
import * as path from "path";
import Handlebars from "handlebars";
import type { PricingComparison, MerchantScrapedData, SalespersonInfo } from "@shared/schema";

Handlebars.registerHelper("add", function (a: number, b: number) {
  return a + b;
});

export interface GeneratedImages {
  heroBanner?: string | null;
  comparisonBackground?: string | null;
  trustVisual?: string | null;
}

export interface AIContent {
  executiveSummary?: string;
  opportunityStatement?: string;
  recommendationSummary?: string;
  recommendationReasons?: string[];
  valuePropositions?: string[];
  industryInsights?: string;
  closingStatement?: string;
  urgencyMessage?: string;
}

export interface VisualProposalData {
  pcbancard_logo_url?: string;
  hero_image_url?: string;
  comparison_background_url?: string;
  trust_visual_url?: string;
  merchant_logo_url?: string;
  business_name: string;
  owner_name?: string;
  business_address?: string;
  business_phone?: string;
  business_email?: string;
  business_description?: string;
  executive_summary?: string;
  opportunity_statement?: string;
  industry_insights?: string;
  value_propositions?: string[];
  closing_statement?: string;
  urgency_message?: string;
  agent_name: string;
  agent_title: string;
  agent_phone: string;
  agent_email: string;
  proposal_date?: string;
  current_monthly_volume: string;
  current_transactions: string;
  current_avg_ticket: string;
  current_monthly_fees: string;
  current_effective_rate: string;
  current_annual_fees: string;
  dp_monthly_cost: string;
  dp_annual_cost: string;
  dp_monthly_savings: string;
  dp_annual_savings: string;
  dp_is_winner: boolean;
  icp_monthly_cost: string;
  icp_annual_cost: string;
  icp_monthly_savings: string;
  icp_annual_savings: string;
  recommended_option: string;
  recommendation_summary: string;
  recommendation_reasons: string[];
  equipment_name: string;
  equipment_tagline?: string;
  equipment_image_url?: string;
  equipment_features: string[];
  timeline_steps: { day: string; title: string; description: string }[];
  disclosures: string[];
}

export interface OnePageProposalData {
  business_name: string;
  merchant_image_url?: string;
  agent_name: string;
  agent_phone: string;
  agent_email: string;
  agent_photo_url?: string;
  surcharge_savings?: string;
  dp_annual_savings: string;
  icp_annual_savings: string;
  terminal_name?: string;
  terminal_price?: string;
  equipment_items?: { name: string; description: string }[];
  qr_code_url?: string;
  pcbancard_logo_url?: string;
}

export class HtmlRenderer {
  private templatePath: string;
  private onePageTemplatePath: string;
  private template: Handlebars.TemplateDelegate | null = null;
  private onePageTemplate: Handlebars.TemplateDelegate | null = null;

  constructor() {
    this.templatePath = path.join(process.cwd(), "server", "templates", "proposal-template.html");
    this.onePageTemplatePath = path.join(process.cwd(), "server", "templates", "one-page-proposal.html");
  }

  private loadTemplate(): Handlebars.TemplateDelegate {
    if (!this.template) {
      const templateSource = fs.readFileSync(this.templatePath, "utf8");
      this.template = Handlebars.compile(templateSource);
    }
    return this.template;
  }

  private loadOnePageTemplate(): Handlebars.TemplateDelegate {
    if (!this.onePageTemplate) {
      const templateSource = fs.readFileSync(this.onePageTemplatePath, "utf8");
      this.onePageTemplate = Handlebars.compile(templateSource);
    }
    return this.onePageTemplate;
  }

  renderHtml(proposalData: VisualProposalData): string {
    const template = this.loadTemplate();
    return template(proposalData);
  }

  renderOnePageHtml(proposalData: OnePageProposalData): string {
    const template = this.loadOnePageTemplate();
    return template(proposalData);
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) {
      return "0.00";
    }
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) {
      return "0";
    }
    return new Intl.NumberFormat("en-US").format(value);
  }

  formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) {
      return "0.00";
    }
    return value.toFixed(2);
  }

  prepareDataFromProposal(
    merchantData: MerchantScrapedData,
    pricingComparison: PricingComparison,
    salesperson: SalespersonInfo,
    equipment?: { name: string; features: string[]; imageBase64?: string },
    generatedImages?: GeneratedImages,
    aiContent?: AIContent
  ): VisualProposalData {
    const current = pricingComparison.currentProcessor;
    const dp = pricingComparison.dualPricing;
    const icp = pricingComparison.interchangePlus;

    const dpMonthlySavings = dp?.monthlySavings || 0;
    const icpMonthlySavings = icp?.monthlySavings || 0;
    const maxAnnualSavings = Math.max(dp?.annualSavings || 0, icp?.annualSavings || 0);

    const defaultOpportunityStatement = `By optimizing your payment processing, you could save up to $${this.formatCurrency(maxAnnualSavings)} annually while improving the customer experience.`;
    const defaultExecutiveSummary = `This proposal outlines a customized payment processing solution for ${merchantData.businessName || "your business"}. Based on our analysis of your current processing costs, we've identified significant savings opportunities.`;

    return {
      business_name: merchantData.businessName || "Valued Merchant",
      owner_name: merchantData.ownerName || undefined,
      business_address: merchantData.address || undefined,
      business_phone: merchantData.phone || undefined,
      business_email: merchantData.email || undefined,
      business_description:
        merchantData.businessDescription ||
        `${merchantData.businessName || "This business"} is committed to providing excellent service to customers.`,
      executive_summary: aiContent?.executiveSummary || defaultExecutiveSummary,
      opportunity_statement: aiContent?.opportunityStatement || defaultOpportunityStatement,
      industry_insights: aiContent?.industryInsights || undefined,
      value_propositions: aiContent?.valuePropositions || undefined,
      closing_statement: aiContent?.closingStatement || undefined,
      urgency_message: aiContent?.urgencyMessage || undefined,
      merchant_logo_url: merchantData.logoBase64 || merchantData.logoUrl || undefined,
      hero_image_url: generatedImages?.heroBanner || undefined,
      comparison_background_url: generatedImages?.comparisonBackground || undefined,
      trust_visual_url: generatedImages?.trustVisual || undefined,
      agent_name: salesperson.name,
      agent_title: salesperson.title,
      agent_phone: salesperson.phone,
      agent_email: salesperson.email,
      proposal_date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      current_monthly_volume: this.formatCurrency(current.monthlyVolume),
      current_transactions: this.formatNumber(current.monthlyTransactions),
      current_avg_ticket: this.formatCurrency(current.avgTicket),
      current_monthly_fees: this.formatCurrency(current.monthlyFees),
      current_effective_rate: this.formatPercent(current.effectiveRate),
      current_annual_fees: this.formatCurrency(current.annualCost),
      dp_monthly_cost: this.formatCurrency(dp?.monthlyFees || 64.95),
      dp_annual_cost: this.formatCurrency((dp?.monthlyFees || 64.95) * 12),
      dp_monthly_savings: this.formatCurrency(dpMonthlySavings),
      dp_annual_savings: this.formatCurrency(dp?.annualSavings || dpMonthlySavings * 12),
      dp_is_winner: dpMonthlySavings > icpMonthlySavings,
      icp_monthly_cost: this.formatCurrency(icp?.monthlyFees || 0),
      icp_annual_cost: this.formatCurrency((icp?.monthlyFees || 0) * 12),
      icp_monthly_savings: this.formatCurrency(icpMonthlySavings),
      icp_annual_savings: this.formatCurrency(icp?.annualSavings || icpMonthlySavings * 12),
      recommended_option:
        pricingComparison.recommendedOption === "dual_pricing" ? "Dual Pricing" : "Interchange Plus",
      recommendation_summary:
        aiContent?.recommendationSummary ||
        (pricingComparison.recommendedOption === "dual_pricing"
          ? "Based on your business profile and processing volume, we recommend Dual Pricing for maximum savings with minimal operational changes."
          : "Based on your processing patterns, Interchange Plus offers competitive savings while maintaining traditional pricing."),
      recommendation_reasons: aiContent?.recommendationReasons || [
        "Maximum savings potential with minimal operational changes",
        "Customers appreciate transparency and choice in payment options",
        "Fully automated system requires no manual price adjustments",
      ],
      equipment_name: equipment?.name || "Clover Flex 3",
      equipment_tagline: "Selected for your business needs and volume",
      equipment_image_url: equipment?.imageBase64 || undefined,
      equipment_features: equipment?.features || [
        "EMV chip card support",
        "NFC/contactless payments",
        "Built-in receipt printer",
        "WiFi + Ethernet connectivity",
        "Dual pricing ready",
        "Long battery life",
      ],
      timeline_steps: [
        { day: "Day 1", title: "Consultation", description: "Finalize program selection and review terms" },
        { day: "Day 2-3", title: "Setup", description: "Equipment configuration and account setup" },
        { day: "Day 4", title: "Installation", description: "On-site installation and staff training" },
        { day: "Day 5", title: "Go Live", description: "Begin processing with new system" },
        { day: "Day 30", title: "Review", description: "First month check-in and optimization" },
      ],
      disclosures: [
        "All savings estimates based on provided processing data and stated assumptions.",
        "Actual results may vary based on card mix, transaction patterns, and customer behavior.",
        "Dual pricing requires compliant signage and customer notification.",
        "Rates and fees subject to underwriting approval.",
        "This proposal is valid for 30 days from the preparation date.",
      ],
    };
  }

  async htmlToPdfWithPuppeteer(htmlContent: string): Promise<Buffer> {
    console.log("[HtmlRenderer] Launching Puppeteer...");
    const puppeteer = await import("puppeteer");
    
    // Try to find system chromium first
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || 
      (await (async () => {
        try {
          const { execSync } = await import("child_process");
          const path = execSync("which chromium").toString().trim();
          console.log("[HtmlRenderer] Using system chromium at:", path);
          return path;
        } catch {
          console.log("[HtmlRenderer] System chromium not found, using bundled");
          return undefined;
        }
      })());
    
    const browser = await puppeteer.default.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });

    try {
      const page = await browser.newPage();

      await page.setContent(htmlContent, {
        waitUntil: ["load", "networkidle0"],
        timeout: 30000,
      });

      const pdfBuffer = await page.pdf({
        format: "Letter",
        printBackground: true,
        margin: {
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
        },
      });

      console.log("[HtmlRenderer] PDF generated successfully with Puppeteer");
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  async htmlToPdfWithFallback(htmlContent: string): Promise<Buffer> {
    console.log("[HtmlRenderer] Attempting PDF generation with html-pdf-node...");
    try {
      const htmlPdfNode = await import("html-pdf-node");
      const options = { format: "Letter" as const, printBackground: true };
      const file = { content: htmlContent };
      const pdfBuffer = await htmlPdfNode.default.generatePdf(file, options);
      console.log("[HtmlRenderer] PDF generated successfully with html-pdf-node");
      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error("[HtmlRenderer] html-pdf-node failed:", error);
      throw error;
    }
  }

  async htmlToPdf(htmlContent: string): Promise<Buffer> {
    try {
      return await this.htmlToPdfWithPuppeteer(htmlContent);
    } catch (puppeteerError) {
      console.warn("[HtmlRenderer] Puppeteer failed, trying fallback:", puppeteerError);
      return await this.htmlToPdfWithFallback(htmlContent);
    }
  }

  async generateProposal(
    merchantData: MerchantScrapedData,
    pricingComparison: PricingComparison,
    salesperson: SalespersonInfo,
    equipment?: { name: string; features: string[]; imageBase64?: string },
    generatedImages?: GeneratedImages,
    aiContent?: AIContent
  ): Promise<Buffer> {
    console.log("[HtmlRenderer] Preparing proposal data...");
    if (aiContent) {
      console.log("[HtmlRenderer] Using AI-generated content for proposal");
    }
    const proposalData = this.prepareDataFromProposal(
      merchantData,
      pricingComparison,
      salesperson,
      equipment,
      generatedImages,
      aiContent
    );

    console.log("[HtmlRenderer] Rendering HTML...");
    const html = this.renderHtml(proposalData);

    console.log("[HtmlRenderer] Converting to PDF...");
    return this.htmlToPdf(html);
  }

  prepareOnePageData(
    merchantData: MerchantScrapedData,
    pricingComparison: PricingComparison,
    salesperson: SalespersonInfo,
    equipment?: { name: string; price?: number; description?: string }[],
    surchargeAnnualSavings?: number,
  ): OnePageProposalData {
    const dp = pricingComparison.dualPricing;
    const icp = pricingComparison.interchangePlus;

    const equipmentItems = equipment?.map(eq => ({
      name: eq.name,
      description: eq.description || `Pay $${eq.price || 295} upfront or opt for our free terminal program with a warranty.`
    }));

    return {
      business_name: merchantData.businessName || "Valued Merchant",
      merchant_image_url: merchantData.logoBase64 || merchantData.logoUrl || undefined,
      agent_name: salesperson.name,
      agent_phone: salesperson.phone,
      agent_email: salesperson.email,
      agent_photo_url: salesperson.photoUrl || undefined,
      surcharge_savings: surchargeAnnualSavings ? this.formatCurrency(surchargeAnnualSavings) : undefined,
      dp_annual_savings: this.formatCurrency(dp?.annualSavings || 0),
      icp_annual_savings: this.formatCurrency(icp?.annualSavings || 0),
      terminal_name: equipment?.[0]?.name || "Dejavoo P1 Terminal",
      terminal_price: equipment?.[0]?.price?.toString() || "295",
      equipment_items: equipmentItems,
      qr_code_url: undefined,
      pcbancard_logo_url: undefined,
    };
  }

  async generateOnePageProposal(
    merchantData: MerchantScrapedData,
    pricingComparison: PricingComparison,
    salesperson: SalespersonInfo,
    equipment?: { name: string; price?: number; description?: string }[],
    surchargeAnnualSavings?: number,
  ): Promise<Buffer> {
    console.log("[HtmlRenderer] Preparing one-page proposal data...");
    const proposalData = this.prepareOnePageData(
      merchantData,
      pricingComparison,
      salesperson,
      equipment,
      surchargeAnnualSavings
    );

    console.log("[HtmlRenderer] Rendering one-page HTML...");
    const html = this.renderOnePageHtml(proposalData);

    console.log("[HtmlRenderer] Converting to PDF...");
    return this.htmlToPdf(html);
  }
}

export const htmlRenderer = new HtmlRenderer();
