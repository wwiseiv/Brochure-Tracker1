import Anthropic from "@anthropic-ai/sdk";
import type { StatementData, AnalysisResult } from "./statement-analysis";
import type { TalkingPoints } from "./talking-points";

const anthropic = new Anthropic();

export interface AIAnalysisResult {
  statementSummary: string;
  costAnalysis: string;
  specificFindings: Array<{
    finding: string;
    problem: string;
    cost: string;
    script: string;
  }>;
  competitiveInsights: string;
  customTalkingPoints: string[];
  savingsRecommendation: string;
  predictedObjections: Array<{
    objection: string;
    response: string;
  }>;
  personalizedClosing: string;
  confidence: number;
}

export async function getAIStatementAnalysis(
  statementData: StatementData,
  calculatedAnalysis: AnalysisResult,
  talkingPoints: TalkingPoints,
  rawStatementText?: string
): Promise<AIAnalysisResult> {
  const prompt = `You are an expert merchant services consultant analyzing a processing statement for a PCBancard sales agent. Your job is to help the agent WIN this deal by identifying every savings opportunity and providing compelling talking points.

## MERCHANT STATEMENT DATA
${JSON.stringify(statementData, null, 2)}

## CALCULATED ANALYSIS
${JSON.stringify(calculatedAnalysis, null, 2)}

## PRE-GENERATED TALKING POINTS
${JSON.stringify(talkingPoints, null, 2)}

${rawStatementText ? `## RAW STATEMENT TEXT (if available)\n${rawStatementText}\n` : ''}

## YOUR ANALYSIS TASK

Provide a comprehensive analysis in JSON format with these sections:

{
  "statementSummary": "2-3 sentence summary of the merchant's current situation",
  
  "costAnalysis": "Detailed explanation of where the merchant's money is going - interchange, assessments, and processor markup. Be specific about dollar amounts.",
  
  "specificFindings": [
    {
      "finding": "What you found (e.g., 'PCI Non-Compliance Fee')",
      "problem": "Why this is costing them money",
      "cost": "Monthly or annual cost in dollars",
      "script": "Exact words the agent should say to the merchant about this"
    }
  ],
  
  "competitiveInsights": "If processor is identifiable, provide insights about known issues with that processor. What should the agent know?",
  
  "customTalkingPoints": [
    "3-5 personalized talking points based on THIS specific merchant's situation",
    "Each should be actionable and compelling"
  ],
  
  "savingsRecommendation": "Should the agent recommend Dual Pricing or Interchange Plus? Explain why based on their business type, volume, and average ticket.",
  
  "predictedObjections": [
    {
      "objection": "Most likely objection this merchant will have",
      "response": "Personalized response using their specific numbers"
    }
  ],
  
  "personalizedClosing": "A custom closing statement that uses the merchant's specific numbers and situation",
  
  "confidence": 0.85
}

Be specific, actionable, and persuasive. The agent will use this in their sales call. Focus on THEIR specific situation - generic advice isn't helpful.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from AI response");
    }

    return JSON.parse(jsonMatch[0]) as AIAnalysisResult;
  } catch (error) {
    console.error("[AIAnalyzer] Error:", error);
    
    return {
      statementSummary: `Merchant is processing $${statementData.totalVolume.toLocaleString()}/month with an effective rate of ${calculatedAnalysis.summary.currentEffectiveRate}%. True interchange cost is only ${calculatedAnalysis.costAnalysis.trueWholesaleRate}%, indicating significant processor markup.`,
      costAnalysis: `Current fees of $${calculatedAnalysis.summary.currentTotalFees}/month include approximately $${calculatedAnalysis.costAnalysis.trueWholesale} in true interchange/assessments and $${calculatedAnalysis.costAnalysis.processorMarkup} in processor markup.`,
      specificFindings: calculatedAnalysis.redFlags.map(flag => ({
        finding: flag.issue,
        problem: flag.detail,
        cost: `$${flag.savings}/month`,
        script: `"I noticed ${flag.detail.toLowerCase()}. This is costing you an extra $${flag.savings} that you could be saving."`
      })),
      competitiveInsights: statementData.processorName 
        ? `Review the merchant's contract with ${statementData.processorName} for early termination fees and auto-renewal clauses.`
        : "Unable to identify current processor. Ask the merchant about their contract terms.",
      customTalkingPoints: [
        `Your effective rate of ${calculatedAnalysis.summary.currentEffectiveRate}% is ${calculatedAnalysis.summary.currentEffectiveRate > 2.5 ? 'above' : 'near'} industry average`,
        `You're paying $${calculatedAnalysis.costAnalysis.processorMarkup}/month in processor markup alone`,
        `With dual pricing, you could save $${calculatedAnalysis.savings.dualPricing.annualSavings}/year`
      ],
      savingsRecommendation: calculatedAnalysis.savings.dualPricing.annualSavings > calculatedAnalysis.savings.interchangePlus.annualSavings
        ? "Recommend Dual Pricing - maximum savings with customer-paid service fee"
        : "Recommend Interchange Plus - transparent pricing with guaranteed margin above cost",
      predictedObjections: [
        {
          objection: "I need to think about it",
          response: `Every month you wait costs you $${calculatedAnalysis.savings.dualPricing.monthlySavings} in unnecessary fees.`
        }
      ],
      personalizedClosing: `Switch to PCBancard and save $${Math.max(calculatedAnalysis.savings.dualPricing.annualSavings, calculatedAnalysis.savings.interchangePlus.annualSavings).toLocaleString()} this year. I can have you processing within 48 hours.`,
      confidence: 0.7
    };
  }
}

export async function generateProposalContent(
  merchantData: StatementData,
  analysis: AnalysisResult,
  salespersonName: string
): Promise<{
  executiveSummary: string;
  savingsBreakdown: string;
  recommendation: string;
  nextSteps: string;
}> {
  const prompt = `Generate professional proposal content for a PCBancard merchant services proposal.

MERCHANT:
- Business: ${merchantData.merchantName || 'Merchant'}
- Monthly Volume: $${merchantData.totalVolume.toLocaleString()}
- Current Fees: $${analysis.summary.currentTotalFees}/month
- Current Rate: ${analysis.summary.currentEffectiveRate}%

SAVINGS ANALYSIS:
- True Interchange Cost: ${analysis.costAnalysis.trueWholesaleRate}%
- Current Processor Markup: ${analysis.costAnalysis.processorMarkupRate}%
- Annual Savings (Interchange Plus): $${analysis.savings.interchangePlus.annualSavings}
- Annual Savings (Dual Pricing): $${analysis.savings.dualPricing.annualSavings}

SALES REP: ${salespersonName}

Generate JSON with:
{
  "executiveSummary": "2-3 paragraph executive summary highlighting the opportunity",
  "savingsBreakdown": "Detailed breakdown of where savings come from",
  "recommendation": "Clear recommendation (Dual Pricing or Interchange Plus) with reasoning",
  "nextSteps": "Clear call to action with timeline"
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error("Could not parse response");
  } catch (error) {
    console.error("[AIAnalyzer] Proposal generation error:", error);
    
    return {
      executiveSummary: `Based on our analysis of your processing activity, we've identified significant savings opportunities. You're currently paying an effective rate of ${analysis.summary.currentEffectiveRate}%, but your true interchange cost is only ${analysis.costAnalysis.trueWholesaleRate}%. This means you're paying ${analysis.costAnalysis.processorMarkupRate}% in unnecessary markup.`,
      savingsBreakdown: `Monthly savings: $${Math.max(analysis.savings.dualPricing.monthlySavings, analysis.savings.interchangePlus.monthlySavings)}. Annual savings: $${Math.max(analysis.savings.dualPricing.annualSavings, analysis.savings.interchangePlus.annualSavings)}.`,
      recommendation: analysis.savings.dualPricing.annualSavings > analysis.savings.interchangePlus.annualSavings 
        ? "We recommend our Dual Pricing program for maximum savings."
        : "We recommend our Interchange Plus program for transparent, competitive pricing.",
      nextSteps: "Contact your PCBancard representative to get started. We can have you processing within 48 hours."
    };
  }
}
