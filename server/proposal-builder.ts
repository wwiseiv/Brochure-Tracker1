import { db } from "./db";
import { proposalJobs, proposals, users } from "@shared/schema";
import type { 
  ProposalJob, 
  ProposalJobStep, 
  ProposalJobStepStatus, 
  MerchantScrapedData,
  PricingComparison,
  SalespersonInfo
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { scrapeMerchantWebsite, fetchLogoAsBase64 } from "./merchant-scrape";
import { parsePDFProposal, type ParsedProposal } from "./proposal-generator";
import { generateProposalImages } from "./proposal-images";
import { generateEnhancedProposalPDF } from "./proposal-document";

const ALL_STEPS: ProposalJobStep[] = [
  "parsing_documents",
  "scraping_website",
  "extracting_pricing",
  "generating_images",
  "building_document",
  "finalizing",
];

function createInitialSteps(): ProposalJobStepStatus[] {
  return ALL_STEPS.map(step => ({
    step,
    status: "pending" as const,
    message: getStepDescription(step),
  }));
}

function getStepDescription(step: ProposalJobStep): string {
  switch (step) {
    case "parsing_documents":
      return "Parsing uploaded cost analysis documents";
    case "scraping_website":
      return "Fetching merchant logo and business info";
    case "extracting_pricing":
      return "Extracting pricing data for comparison";
    case "generating_images":
      return "Creating custom proposal images";
    case "building_document":
      return "Building professional proposal document";
    case "finalizing":
      return "Finalizing and saving proposal";
    default:
      return "Processing";
  }
}

async function updateJobStep(
  jobId: number,
  step: ProposalJobStep,
  status: "running" | "completed" | "failed",
  message?: string,
  error?: string
) {
  const job = await db.select().from(proposalJobs).where(eq(proposalJobs.id, jobId)).limit(1);
  if (!job.length) return;

  const steps = (job[0].steps as ProposalJobStepStatus[]) || createInitialSteps();
  const stepIndex = steps.findIndex(s => s.step === step);
  
  if (stepIndex >= 0) {
    steps[stepIndex] = {
      ...steps[stepIndex],
      status,
      message: message || steps[stepIndex].message,
      ...(status === "running" && { startedAt: new Date().toISOString() }),
      ...(status === "completed" && { completedAt: new Date().toISOString() }),
      ...(error && { error }),
    };
  }

  await db.update(proposalJobs)
    .set({
      steps,
      currentStep: step,
      status: status === "failed" ? "failed" : (step === "finalizing" && status === "completed" ? "completed" : "running"),
      updatedAt: new Date(),
    })
    .where(eq(proposalJobs.id, jobId));
}

async function updateJobData(jobId: number, data: Partial<ProposalJob>) {
  await db.update(proposalJobs)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(proposalJobs.id, jobId));
}

export interface ProposalBuildInput {
  userId: string;
  organizationId?: number;
  merchantWebsiteUrl?: string;
  salesperson: SalespersonInfo;
  selectedEquipmentId?: number;
  outputFormat: "pdf" | "docx";
  dualPricingBuffer?: Buffer;
  interchangePlusBuffer?: Buffer;
  dualPricingFileName?: string;
  interchangePlusFileName?: string;
}

export async function createProposalJob(input: ProposalBuildInput): Promise<number> {
  const [job] = await db.insert(proposalJobs).values({
    userId: input.userId,
    organizationId: input.organizationId || null,
    status: "pending",
    steps: createInitialSteps(),
    merchantWebsiteUrl: input.merchantWebsiteUrl || null,
    salespersonInfo: input.salesperson,
    selectedEquipmentId: input.selectedEquipmentId || null,
    outputFormat: input.outputFormat,
  }).returning();

  return job.id;
}

export async function executeProposalJob(
  jobId: number,
  input: ProposalBuildInput
): Promise<void> {
  try {
    let parsedDualPricing: ParsedProposal | null = null;
    let parsedInterchangePlus: ParsedProposal | null = null;

    await updateJobStep(jobId, "parsing_documents", "running", "Parsing cost analysis documents...");
    
    try {
      if (input.dualPricingBuffer) {
        parsedDualPricing = await parsePDFProposal(input.dualPricingBuffer);
      }
      
      if (input.interchangePlusBuffer) {
        parsedInterchangePlus = await parsePDFProposal(input.interchangePlusBuffer);
      }
      
      await updateJobStep(jobId, "parsing_documents", "completed", "Documents parsed successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse documents";
      await updateJobStep(jobId, "parsing_documents", "failed", "Document parsing failed", message);
      throw error;
    }

    await updateJobStep(jobId, "scraping_website", "running", "Fetching merchant website...");
    
    let merchantData: MerchantScrapedData = {
      logoUrl: null,
      logoBase64: null,
      businessName: parsedDualPricing?.merchantName || parsedInterchangePlus?.merchantName || "Merchant",
      businessDescription: null,
      address: null,
      phone: null,
      industry: null,
      websiteUrl: input.merchantWebsiteUrl || null,
    };

    try {
      if (input.merchantWebsiteUrl) {
        const scraped = await scrapeMerchantWebsite(input.merchantWebsiteUrl);
        
        if (scraped.success && scraped.data) {
          merchantData = {
            logoUrl: scraped.data.logoUrl,
            logoBase64: null,
            businessName: scraped.data.businessName || merchantData.businessName,
            businessDescription: scraped.data.businessDescription,
            address: scraped.data.address,
            phone: scraped.data.phone,
            industry: scraped.data.industry,
            websiteUrl: input.merchantWebsiteUrl,
          };

          if (scraped.data.logoUrl) {
            merchantData.logoBase64 = await fetchLogoAsBase64(scraped.data.logoUrl);
          }
        }
      }
      
      await updateJobData(jobId, { merchantScrapedData: merchantData });
      await updateJobStep(jobId, "scraping_website", "completed", 
        merchantData.logoBase64 ? "Merchant info and logo retrieved" : "Merchant info retrieved (no logo found)");
    } catch (error) {
      console.error("[ProposalBuilder] Website scraping error:", error);
      await updateJobData(jobId, { merchantScrapedData: merchantData });
      await updateJobStep(jobId, "scraping_website", "completed", "Proceeding without website data");
    }

    await updateJobStep(jobId, "extracting_pricing", "running", "Building pricing comparison...");
    
    try {
      const primaryParsed = parsedDualPricing || parsedInterchangePlus;
      
      const pricingComparison: PricingComparison = {
        currentProcessor: {
          monthlyVolume: primaryParsed?.currentState?.totalVolume || 0,
          monthlyTransactions: primaryParsed?.currentState?.totalTransactions || 0,
          avgTicket: primaryParsed?.currentState?.avgTicket || 0,
          monthlyFees: primaryParsed?.currentState?.totalMonthlyCost || 0,
          effectiveRate: primaryParsed?.currentState?.effectiveRatePercent || 0,
          annualCost: (primaryParsed?.currentState?.totalMonthlyCost || 0) * 12,
          cardBreakdown: {
            visa: {
              volume: primaryParsed?.currentState?.cardBreakdown?.visa?.volume || 0,
              cost: primaryParsed?.currentState?.cardBreakdown?.visa?.totalCost || 0,
            },
            mastercard: {
              volume: primaryParsed?.currentState?.cardBreakdown?.mastercard?.volume || 0,
              cost: primaryParsed?.currentState?.cardBreakdown?.mastercard?.totalCost || 0,
            },
            discover: {
              volume: primaryParsed?.currentState?.cardBreakdown?.discover?.volume || 0,
              cost: primaryParsed?.currentState?.cardBreakdown?.discover?.totalCost || 0,
            },
            amex: {
              volume: primaryParsed?.currentState?.cardBreakdown?.amex?.volume || 0,
              cost: primaryParsed?.currentState?.cardBreakdown?.amex?.totalCost || 0,
            },
          },
        },
        recommendedOption: "dual_pricing",
      };

      if (parsedDualPricing?.optionDualPricing) {
        pricingComparison.dualPricing = {
          monthlyFees: parsedDualPricing.optionDualPricing.totalMonthlyCost,
          monthlySavings: parsedDualPricing.optionDualPricing.monthlySavings,
          annualSavings: parsedDualPricing.optionDualPricing.annualSavings,
          savingsPercent: parsedDualPricing.optionDualPricing.savingsPercent,
          programFee: parsedDualPricing.optionDualPricing.monthlyProgramFee,
        };
      }

      if (parsedInterchangePlus?.optionInterchangePlus) {
        pricingComparison.interchangePlus = {
          monthlyFees: parsedInterchangePlus.optionInterchangePlus.totalMonthlyCost,
          monthlySavings: parsedInterchangePlus.optionInterchangePlus.monthlySavings,
          annualSavings: parsedInterchangePlus.optionInterchangePlus.annualSavings,
          savingsPercent: parsedInterchangePlus.optionInterchangePlus.savingsPercent,
          discountRate: parsedInterchangePlus.optionInterchangePlus.discountRatePercent,
          perTxFee: parsedInterchangePlus.optionInterchangePlus.perTransactionFee,
        };
      }

      const dpSavings = pricingComparison.dualPricing?.monthlySavings || 0;
      const icSavings = pricingComparison.interchangePlus?.monthlySavings || 0;
      pricingComparison.recommendedOption = dpSavings >= icSavings ? "dual_pricing" : "interchange_plus";

      await updateJobData(jobId, { pricingComparison });
      await updateJobStep(jobId, "extracting_pricing", "completed", "Pricing comparison ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Pricing extraction failed";
      await updateJobStep(jobId, "extracting_pricing", "failed", "Failed to extract pricing", message);
      throw error;
    }

    await updateJobStep(jobId, "generating_images", "running", "Creating proposal images with AI...");
    
    try {
      const industry = merchantData.industry || "general business";
      const images = await generateProposalImages(industry, merchantData.businessName || undefined);
      
      if (images.heroBanner || images.comparisonBackground || images.trustVisual) {
        await updateJobData(jobId, {
          generatedImages: {
            heroBanner: images.heroBanner,
            comparisonBackground: images.comparisonBackground,
            trustVisual: images.trustVisual,
          },
        });
        await updateJobStep(jobId, "generating_images", "completed", "Custom images generated");
      } else {
        await updateJobStep(jobId, "generating_images", "completed", "Proceeding without custom images");
      }
    } catch (error) {
      console.error("[ProposalBuilder] Image generation error:", error);
      await updateJobStep(jobId, "generating_images", "completed", "Proceeding without custom images");
    }

    await updateJobStep(jobId, "building_document", "running", "Assembling professional proposal...");
    
    try {
      const job = await db.select().from(proposalJobs).where(eq(proposalJobs.id, jobId)).limit(1);
      const currentJob = job[0];
      
      if (currentJob?.pricingComparison && currentJob?.merchantScrapedData && currentJob?.salespersonInfo) {
        const pdfBuffer = await generateEnhancedProposalPDF({
          merchantData: currentJob.merchantScrapedData as MerchantScrapedData,
          pricingComparison: currentJob.pricingComparison as PricingComparison,
          salesperson: currentJob.salespersonInfo as SalespersonInfo,
          generatedImages: currentJob.generatedImages as any,
        });
        
        // Store PDF in memory or save to file system
        // For now, we'll encode as base64 and store temporarily
        const pdfBase64 = pdfBuffer.toString('base64');
        const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;
        
        await updateJobData(jobId, { pdfUrl: pdfDataUrl });
        await updateJobStep(jobId, "building_document", "completed", "Proposal document generated");
      } else {
        await updateJobStep(jobId, "building_document", "completed", "Document structure ready (missing data)");
      }
    } catch (error) {
      console.error("[ProposalBuilder] Document generation error:", error);
      await updateJobStep(jobId, "building_document", "completed", "Proceeding without full document");
    }

    await updateJobStep(jobId, "finalizing", "running", "Saving proposal...");
    
    await db.update(proposalJobs)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(proposalJobs.id, jobId));

    await updateJobStep(jobId, "finalizing", "completed", "Proposal ready for download");

  } catch (error) {
    console.error("[ProposalBuilder] Job failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    
    await db.update(proposalJobs)
      .set({
        status: "failed",
        errors: [message],
        updatedAt: new Date(),
      })
      .where(eq(proposalJobs.id, jobId));
    
    throw error;
  }
}

export async function getProposalJobStatus(jobId: number): Promise<ProposalJob | null> {
  const jobs = await db.select().from(proposalJobs).where(eq(proposalJobs.id, jobId)).limit(1);
  return jobs[0] || null;
}
