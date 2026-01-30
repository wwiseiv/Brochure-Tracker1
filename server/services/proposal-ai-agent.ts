import OpenAI from "openai";
import type { MerchantScrapedData, PricingComparison, SalespersonInfo } from "@shared/schema";

let openaiAIIntegrations: OpenAI | null = null;

function getAIClient(): OpenAI {
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

export interface AIGeneratedContent {
  executiveSummary: string;
  opportunityStatement: string;
  recommendationSummary: string;
  recommendationReasons: string[];
  valuePropositions: string[];
  industryInsights: string;
  closingStatement: string;
  urgencyMessage: string;
}

export interface ProposalContext {
  merchantData: MerchantScrapedData;
  pricingComparison: PricingComparison;
  salesperson: SalespersonInfo;
  selectedEquipment?: {
    name: string;
    features: string[];
  };
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function generateProposalContent(context: ProposalContext): Promise<AIGeneratedContent> {
  const { merchantData, pricingComparison, salesperson, selectedEquipment } = context;
  
  const businessName = merchantData.businessName || "the merchant";
  const industry = merchantData.industry || "retail";
  const currentMonthlyFees = pricingComparison.currentProcessor.monthlyFees;
  const monthlyVolume = pricingComparison.currentProcessor.monthlyVolume;
  
  const recommendedOption = pricingComparison.recommendedOption;
  const recommendedData = recommendedOption === "dual_pricing" 
    ? pricingComparison.dualPricing 
    : pricingComparison.interchangePlus;
  
  const monthlySavings = recommendedData?.monthlySavings || 0;
  const annualSavings = recommendedData?.annualSavings || 0;
  const savingsPercent = recommendedData?.savingsPercent || 0;

  const prompt = `You are an expert sales proposal writer for PCBancard, a payment processing company. Generate compelling, personalized proposal content for the following merchant.

MERCHANT PROFILE:
- Business Name: ${businessName}
- Industry: ${industry}
- Business Description: ${merchantData.businessDescription || "Not provided"}
- Monthly Processing Volume: $${formatCurrency(monthlyVolume)}
- Current Monthly Processing Fees: $${formatCurrency(currentMonthlyFees)}

SAVINGS OPPORTUNITY:
- Recommended Solution: ${recommendedOption === "dual_pricing" ? "Dual Pricing Program" : "Interchange Plus Pricing"}
- Projected Monthly Savings: $${formatCurrency(monthlySavings)}
- Projected Annual Savings: $${formatCurrency(annualSavings)}
- Savings Percentage: ${savingsPercent.toFixed(1)}%

SALESPERSON:
- Name: ${salesperson.name}
- Title: ${salesperson.title}

${selectedEquipment ? `RECOMMENDED EQUIPMENT: ${selectedEquipment.name}` : ""}

Generate the following content in JSON format. Make the content specific to the ${industry} industry when possible. Be professional, persuasive, and focused on value:

{
  "executiveSummary": "A compelling 2-3 sentence summary highlighting the opportunity and key benefit for this specific business. Mention the business name and industry.",
  "opportunityStatement": "One powerful sentence about the savings opportunity that creates urgency.",
  "recommendationSummary": "2-3 sentences explaining why ${recommendedOption === "dual_pricing" ? "Dual Pricing" : "Interchange Plus"} is the best fit for this specific type of business.",
  "recommendationReasons": ["Reason 1 specific to their industry", "Reason 2 about savings", "Reason 3 about ease/compliance", "Reason 4 about competitive advantage"],
  "valuePropositions": ["Value prop 1 relevant to ${industry}", "Value prop 2", "Value prop 3"],
  "industryInsights": "1-2 sentences about payment processing trends or challenges specific to the ${industry} industry.",
  "closingStatement": "A confident 1-2 sentence call to action from ${salesperson.name}.",
  "urgencyMessage": "A compelling reason to act now (without being pushy)."
}

Respond ONLY with valid JSON. No markdown, no explanation.`;

  try {
    const ai = getAIClient();
    
    const response = await ai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional sales proposal writer. Generate compelling, industry-specific content that helps close deals. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_completion_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("[ProposalAIAgent] No content in AI response");
      return getDefaultContent(context);
    }

    const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    const parsed = JSON.parse(cleanedContent) as AIGeneratedContent;
    
    console.log("[ProposalAIAgent] Successfully generated AI content for", businessName);
    return parsed;
    
  } catch (error) {
    console.error("[ProposalAIAgent] Error generating content:", error);
    return getDefaultContent(context);
  }
}

function getDefaultContent(context: ProposalContext): AIGeneratedContent {
  const { merchantData, pricingComparison, salesperson } = context;
  const businessName = merchantData.businessName || "your business";
  const industry = merchantData.industry || "your industry";
  const recommendedOption = pricingComparison.recommendedOption;
  const recommendedData = recommendedOption === "dual_pricing" 
    ? pricingComparison.dualPricing 
    : pricingComparison.interchangePlus;
  const annualSavings = recommendedData?.annualSavings || 0;
  
  return {
    executiveSummary: `This proposal outlines a customized payment processing solution for ${businessName}. Based on our analysis of your current processing costs, we've identified significant savings opportunities that can improve your bottom line.`,
    opportunityStatement: `By optimizing your payment processing, you could save up to $${formatCurrency(annualSavings)} annually.`,
    recommendationSummary: recommendedOption === "dual_pricing"
      ? "Dual Pricing allows you to offset credit card processing fees while maintaining competitive pricing for cash-paying customers. This program is fully compliant and transparent."
      : "Interchange Plus pricing provides transparent, wholesale-level rates with a small markup. You'll see exactly what you pay for each transaction with no hidden fees.",
    recommendationReasons: [
      "Significant reduction in monthly processing costs",
      "Transparent pricing with no hidden fees",
      "Full compliance with card network regulations",
      "Dedicated local support from your PCBancard representative"
    ],
    valuePropositions: [
      "Lower your payment processing costs immediately",
      "Access to modern payment equipment and technology",
      "Local support you can count on"
    ],
    industryInsights: `Businesses in the ${industry} sector are increasingly adopting optimized payment solutions to improve margins in competitive markets.`,
    closingStatement: `I look forward to helping ${businessName} save money and streamline your payment processing. - ${salesperson.name}`,
    urgencyMessage: "Lock in these savings before rates change. Contact us today to get started."
  };
}

export async function analyzeProposalStrategy(context: ProposalContext): Promise<{
  keySellingPoints: string[];
  potentialObjections: string[];
  responseStrategies: string[];
}> {
  const { merchantData, pricingComparison } = context;
  
  const prompt = `Analyze this merchant profile and provide sales strategy insights.

MERCHANT:
- Business: ${merchantData.businessName} (${merchantData.industry || "General"})
- Monthly Volume: $${formatCurrency(pricingComparison.currentProcessor.monthlyVolume)}
- Current Fees: $${formatCurrency(pricingComparison.currentProcessor.monthlyFees)}
- Potential Savings: $${formatCurrency(pricingComparison.dualPricing?.monthlySavings || pricingComparison.interchangePlus?.monthlySavings || 0)}/month

Provide a brief JSON response with:
{
  "keySellingPoints": ["3 specific selling points for this merchant"],
  "potentialObjections": ["2-3 likely objections they might have"],
  "responseStrategies": ["Brief response strategy for each objection"]
}

JSON only, no markdown.`;

  try {
    const ai = getAIClient();
    
    const response = await ai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_completion_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        keySellingPoints: ["Significant cost savings", "Modern equipment", "Local support"],
        potentialObjections: ["Switching costs", "Current contract terms"],
        responseStrategies: ["We handle the transition", "We can review your contract together"]
      };
    }

    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
    
  } catch (error) {
    console.error("[ProposalAIAgent] Strategy analysis error:", error);
    return {
      keySellingPoints: ["Significant cost savings", "Modern equipment", "Local support"],
      potentialObjections: ["Switching costs", "Current contract terms"],
      responseStrategies: ["We handle the transition", "We can review your contract together"]
    };
  }
}
