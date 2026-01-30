import * as fs from "fs";
import * as path from "path";
import Handlebars from "handlebars";
import puppeteer from "puppeteer";
import type { PricingComparison, MerchantScrapedData, SalespersonInfo } from "@shared/schema";

Handlebars.registerHelper("add", function (a: number, b: number) {
  return a + b;
});

export interface VisualProposalData {
  pcbancard_logo_url?: string;
  hero_image_url?: string;
  merchant_logo_url?: string;
  business_name: string;
  owner_name?: string;
  business_address?: string;
  business_phone?: string;
  business_email?: string;
  business_description?: string;
  opportunity_statement?: string;
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

export class HtmlRenderer {
  private templatePath: string;
  private template: Handlebars.TemplateDelegate | null = null;

  constructor() {
    this.templatePath = path.join(process.cwd(), "server", "templates", "proposal-template.html");
  }

  private loadTemplate(): Handlebars.TemplateDelegate {
    if (!this.template) {
      const templateSource = fs.readFileSync(this.templatePath, "utf8");
      this.template = Handlebars.compile(templateSource);
    }
    return this.template;
  }

  renderHtml(proposalData: VisualProposalData): string {
    const template = this.loadTemplate();
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
    equipment?: { name: string; features: string[]; imageBase64?: string }
  ): VisualProposalData {
    const current = pricingComparison.currentProcessor;
    const dp = pricingComparison.dualPricing;
    const icp = pricingComparison.interchangePlus;

    const dpMonthlySavings = dp?.monthlySavings || 0;
    const icpMonthlySavings = icp?.monthlySavings || 0;

    return {
      business_name: merchantData.businessName || "Valued Merchant",
      owner_name: merchantData.ownerName || undefined,
      business_address: merchantData.address || undefined,
      business_phone: merchantData.phone || undefined,
      business_email: merchantData.email || undefined,
      business_description:
        merchantData.businessDescription ||
        `${merchantData.businessName || "This business"} is committed to providing excellent service to customers.`,
      opportunity_statement: `By optimizing your payment processing, you could save up to $${this.formatCurrency(
        Math.max(dp?.annualSavings || 0, icp?.annualSavings || 0)
      )} annually while improving the customer experience.`,
      merchant_logo_url: merchantData.logoBase64 || merchantData.logoUrl || undefined,
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
        pricingComparison.recommendedOption === "dual_pricing"
          ? "Based on your business profile and processing volume, we recommend Dual Pricing for maximum savings with minimal operational changes."
          : "Based on your processing patterns, Interchange Plus offers competitive savings while maintaining traditional pricing.",
      recommendation_reasons: [
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

  async htmlToPdf(htmlContent: string): Promise<Buffer> {
    console.log("[HtmlRenderer] Launching Puppeteer...");
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
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

      console.log("[HtmlRenderer] PDF generated successfully");
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  async generateProposal(
    merchantData: MerchantScrapedData,
    pricingComparison: PricingComparison,
    salesperson: SalespersonInfo,
    equipment?: { name: string; features: string[]; imageBase64?: string }
  ): Promise<Buffer> {
    console.log("[HtmlRenderer] Preparing proposal data...");
    const proposalData = this.prepareDataFromProposal(
      merchantData,
      pricingComparison,
      salesperson,
      equipment
    );

    console.log("[HtmlRenderer] Rendering HTML...");
    const html = this.renderHtml(proposalData);

    console.log("[HtmlRenderer] Converting to PDF...");
    return this.htmlToPdf(html);
  }
}

export const htmlRenderer = new HtmlRenderer();
