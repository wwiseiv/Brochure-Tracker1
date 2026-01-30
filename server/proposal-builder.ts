import { db } from "./db";
import { proposalJobs, proposals, users, equipmentProducts } from "@shared/schema";
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
import { htmlRenderer, type GeneratedImages, type AIContent } from "./renderers/html-renderer";
import { generateProposalContent, type AIGeneratedContent } from "./services/proposal-ai-agent";

const USE_VISUAL_RENDERER = process.env.USE_VISUAL_RENDERER === "true";

const ALL_STEPS: ProposalJobStep[] = [
  "parsing_documents",
  "scraping_website",
  "extracting_pricing",
  "ai_analysis",
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
    case "ai_analysis":
      return "AI analyzing data and generating proposal content";
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

export interface MerchantFormData {
  businessName?: string | null;
  ownerName?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  industry?: string | null;
  repNotes?: string | null;
}

export interface ProposalBuildInput {
  userId: string;
  organizationId?: number;
  merchantWebsiteUrl?: string;
  merchantFormData?: MerchantFormData;
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
    
    // Start with form data as priority, then fallback to parsed/scraped data
    const formData = input.merchantFormData;
    let merchantData: MerchantScrapedData = {
      logoUrl: null,
      logoBase64: null,
      businessName: formData?.businessName || parsedDualPricing?.merchantName || parsedInterchangePlus?.merchantName || "Merchant",
      businessDescription: null,
      address: formData?.address || null,
      phone: formData?.phone || null,
      industry: formData?.industry || null,
      websiteUrl: formData?.website || input.merchantWebsiteUrl || null,
      // Extended fields for PDF rendering
      ownerName: formData?.ownerName || null,
      email: formData?.email || null,
    };

    console.log("[ProposalBuilder] Initial merchant data from form:", {
      businessName: merchantData.businessName,
      ownerName: (merchantData as any).ownerName,
      address: merchantData.address,
      phone: merchantData.phone,
      email: (merchantData as any).email,
    });

    try {
      const websiteUrl = formData?.website || input.merchantWebsiteUrl;
      if (websiteUrl) {
        console.log("[ProposalBuilder] Scraping website:", websiteUrl);
        const scraped = await scrapeMerchantWebsite(websiteUrl);
        
        if (scraped.success && scraped.data) {
          console.log("[ProposalBuilder] Scraped data:", {
            logoUrl: scraped.data.logoUrl,
            businessName: scraped.data.businessName,
            industry: scraped.data.industry,
          });
          
          // Merge: form data takes priority over scraped data
          merchantData = {
            logoUrl: scraped.data.logoUrl,
            logoBase64: null,
            businessName: formData?.businessName || scraped.data.businessName || merchantData.businessName,
            businessDescription: scraped.data.businessDescription,
            address: formData?.address || scraped.data.address || null,
            phone: formData?.phone || scraped.data.phone || null,
            industry: formData?.industry || scraped.data.industry || null,
            websiteUrl: websiteUrl,
            ownerName: formData?.ownerName || null,
            email: formData?.email || null,
          };

          if (scraped.data.logoUrl) {
            merchantData.logoBase64 = await fetchLogoAsBase64(scraped.data.logoUrl);
            console.log("[ProposalBuilder] Logo fetched:", merchantData.logoBase64 ? "Success" : "Failed");
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

    // AI Analysis Step - Generate intelligent proposal content
    await updateJobStep(jobId, "ai_analysis", "running", "AI analyzing merchant data and generating content...");
    
    let aiGeneratedContent: AIGeneratedContent | null = null;
    try {
      // Re-fetch job data to get latest pricing comparison
      const jobForAI = await db.select().from(proposalJobs).where(eq(proposalJobs.id, jobId)).limit(1);
      const currentJobForAI = jobForAI[0];
      
      if (currentJobForAI?.pricingComparison && currentJobForAI?.salespersonInfo) {
        // Fetch equipment data if selected
        let selectedEquipment: { name: string; features: string[] } | undefined;
        if (currentJobForAI.selectedEquipmentId) {
          const [product] = await db.select().from(equipmentProducts).where(eq(equipmentProducts.id, currentJobForAI.selectedEquipmentId));
          if (product) {
            selectedEquipment = {
              name: product.name,
              features: (product.features as string[]) || [],
            };
          }
        }
        
        console.log("[ProposalBuilder] Invoking AI agent for content generation...");
        aiGeneratedContent = await generateProposalContent({
          merchantData,
          pricingComparison: currentJobForAI.pricingComparison,
          salesperson: currentJobForAI.salespersonInfo,
          selectedEquipment,
        });
        
        // Store AI-generated content
        await updateJobData(jobId, { aiGeneratedContent });
        await updateJobStep(jobId, "ai_analysis", "completed", "AI content generated successfully");
        console.log("[ProposalBuilder] AI content generation complete");
      } else {
        await updateJobStep(jobId, "ai_analysis", "completed", "Proceeding with default content");
      }
    } catch (error) {
      console.error("[ProposalBuilder] AI analysis error:", error);
      await updateJobStep(jobId, "ai_analysis", "completed", "Proceeding with default content");
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
        let pdfBuffer: Buffer;
        
        const proposalStyle = currentJob.proposalStyle || "one-page";
        
        if (proposalStyle === "one-page") {
          console.log("[ProposalBuilder] Using one-page proposal template");
          
          let equipmentItems: { name: string; price?: number; description?: string }[] = [];
          if (currentJob.selectedEquipmentId) {
            const [product] = await db.select().from(equipmentProducts).where(eq(equipmentProducts.id, currentJob.selectedEquipmentId));
            if (product) {
              const priceValue = product.priceRange ? parseFloat(product.priceRange.replace(/[^0-9.]/g, '')) : 295;
              equipmentItems.push({
                name: product.name,
                price: priceValue,
                description: `Pay $${priceValue} upfront or opt for our free terminal program with a warranty.`
              });
              console.log("[ProposalBuilder] Using selected equipment:", product.name);
            }
          }
          
          pdfBuffer = await htmlRenderer.generateOnePageProposal(
            currentJob.merchantScrapedData as MerchantScrapedData,
            currentJob.pricingComparison as PricingComparison,
            currentJob.salespersonInfo as SalespersonInfo,
            equipmentItems.length > 0 ? equipmentItems : undefined
          );
        } else if (USE_VISUAL_RENDERER || proposalStyle === "multi-page") {
          console.log("[ProposalBuilder] Using visual HTML renderer for PDF generation");
          
          let equipmentData: { name: string; features: string[]; imageBase64?: string } | undefined;
          if (currentJob.selectedEquipmentId) {
            const [product] = await db.select().from(equipmentProducts).where(eq(equipmentProducts.id, currentJob.selectedEquipmentId));
            if (product) {
              equipmentData = {
                name: product.name,
                features: (product.features as string[]) || [],
                imageBase64: product.imageUrl || undefined,
              };
              console.log("[ProposalBuilder] Using selected equipment:", product.name);
            }
          }
          
          const images = currentJob.generatedImages as GeneratedImages | undefined;
          const aiContent = currentJob.aiGeneratedContent as AIContent | undefined;
          
          pdfBuffer = await htmlRenderer.generateProposal(
            currentJob.merchantScrapedData as MerchantScrapedData,
            currentJob.pricingComparison as PricingComparison,
            currentJob.salespersonInfo as SalespersonInfo,
            equipmentData,
            images,
            aiContent
          );
        } else {
          console.log("[ProposalBuilder] Using legacy PDF generator");
          pdfBuffer = await generateEnhancedProposalPDF({
            merchantData: currentJob.merchantScrapedData as MerchantScrapedData,
            pricingComparison: currentJob.pricingComparison as PricingComparison,
            salesperson: currentJob.salespersonInfo as SalespersonInfo,
            generatedImages: currentJob.generatedImages as any,
          });
        }
        
        const pdfBase64 = pdfBuffer.toString('base64');
        const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;
        
        await updateJobData(jobId, { pdfUrl: pdfDataUrl });
        await updateJobStep(jobId, "building_document", "completed", 
          USE_VISUAL_RENDERER ? "Visual proposal document generated" : "Proposal document generated");
      } else {
        await updateJobStep(jobId, "building_document", "completed", "Document structure ready (missing data)");
      }
    } catch (error) {
      console.error("[ProposalBuilder] Document generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown PDF generation error";
      await updateJobStep(jobId, "building_document", "failed", `PDF generation failed: ${errorMessage}`);
      throw new Error(`PDF generation failed: ${errorMessage}`);
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
