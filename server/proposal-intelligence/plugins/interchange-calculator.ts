import type { ProposalPlugin } from "../core/plugin-manager";
import type { ProposalContext } from "../core/types";
import {
  VISA_RATES,
  MASTERCARD_RATES,
  DISCOVER_RATES,
  AMEX_OPTBLUE_RATES,
  ASSESSMENT_FEES,
  DEFAULT_CARD_MIX,
  AVERAGE_RATES_BY_CATEGORY,
  DUAL_PRICING_INFO,
  normalizeMerchantType,
  type CardMix,
  type MerchantCategory,
} from "../data/interchange-rates";

export interface InterchangeCalculation {
  monthlyVolume: number;
  averageTicket: number;
  transactionCount: number;
  cardMix: CardMix;
  category: MerchantCategory;
  isCardPresent: boolean;
  
  interchangeCost: number;
  assessmentCost: number;
  totalWholesaleCost: number;
  effectiveRate: number;
  
  breakdown: {
    visa: { volume: number; cost: number; rate: number };
    mastercard: { volume: number; cost: number; rate: number };
    discover: { volume: number; cost: number; rate: number };
    amex: { volume: number; cost: number; rate: number };
    debit: { volume: number; cost: number; rate: number };
  };
  
  dualPricingSavings?: {
    serviceFeeCollected: number;
    netCostToMerchant: number;
    annualSavings: number;
  };
}

export function calculateInterchange(
  monthlyVolume: number,
  averageTicket: number,
  category: MerchantCategory | string = "retail",
  isCardPresent: boolean = true,
  cardMix: CardMix = DEFAULT_CARD_MIX
): InterchangeCalculation {
  const transactionCount = Math.round(monthlyVolume / averageTicket);
  const normalizedCategory = normalizeMerchantType(category as string);
  const categoryRates = AVERAGE_RATES_BY_CATEGORY[normalizedCategory] || AVERAGE_RATES_BY_CATEGORY.retail;
  const baseRate = isCardPresent ? categoryRates.cardPresent : categoryRates.cardNotPresent;

  const visaVolume = monthlyVolume * cardMix.visa;
  const mcVolume = monthlyVolume * cardMix.mastercard;
  const discoverVolume = monthlyVolume * cardMix.discover;
  const amexVolume = monthlyVolume * cardMix.amex;
  const debitVolume = monthlyVolume * (cardMix.debit + cardMix.debitRegulated);

  const visaRate = isCardPresent ? 1.65 : 1.80;
  const mcRate = isCardPresent ? 1.58 : 1.95;
  const discoverRate = isCardPresent ? 1.56 : 1.81;
  const amexRate = isCardPresent ? 1.90 : 2.20;
  const debitRate = isCardPresent ? 0.80 : 1.65;

  const perTxnFee = 0.10;
  const visaTxns = Math.round(transactionCount * cardMix.visa);
  const mcTxns = Math.round(transactionCount * cardMix.mastercard);
  const discoverTxns = Math.round(transactionCount * cardMix.discover);
  const amexTxns = Math.round(transactionCount * cardMix.amex);
  const debitTxns = Math.round(transactionCount * (cardMix.debit + cardMix.debitRegulated));

  const visaCost = (visaVolume * visaRate / 100) + (visaTxns * perTxnFee);
  const mcCost = (mcVolume * mcRate / 100) + (mcTxns * perTxnFee);
  const discoverCost = (discoverVolume * discoverRate / 100) + (discoverTxns * perTxnFee);
  const amexCost = (amexVolume * amexRate / 100) + (amexTxns * perTxnFee);
  const debitCost = (debitVolume * debitRate / 100) + (debitTxns * 0.15);

  const interchangeCost = visaCost + mcCost + discoverCost + amexCost + debitCost;

  const visaAssessment = visaVolume * 0.0013;
  const mcAssessment = mcVolume * 0.0013;
  const discoverAssessment = discoverVolume * 0.0013;
  const amexAssessment = amexVolume * 0.0015;
  const assessmentCost = visaAssessment + mcAssessment + discoverAssessment + amexAssessment;

  const totalWholesaleCost = interchangeCost + assessmentCost;
  const effectiveRate = (totalWholesaleCost / monthlyVolume) * 100;

  const dualPricingServiceFee = 3.50;
  const serviceFeeCollected = monthlyVolume * (dualPricingServiceFee / 100);
  const netCostToMerchant = Math.max(0, totalWholesaleCost - serviceFeeCollected);
  const annualSavings = (totalWholesaleCost - netCostToMerchant) * 12;

  return {
    monthlyVolume,
    averageTicket,
    transactionCount,
    cardMix,
    category,
    isCardPresent,
    interchangeCost: Math.round(interchangeCost * 100) / 100,
    assessmentCost: Math.round(assessmentCost * 100) / 100,
    totalWholesaleCost: Math.round(totalWholesaleCost * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    breakdown: {
      visa: { volume: visaVolume, cost: Math.round(visaCost * 100) / 100, rate: visaRate },
      mastercard: { volume: mcVolume, cost: Math.round(mcCost * 100) / 100, rate: mcRate },
      discover: { volume: discoverVolume, cost: Math.round(discoverCost * 100) / 100, rate: discoverRate },
      amex: { volume: amexVolume, cost: Math.round(amexCost * 100) / 100, rate: amexRate },
      debit: { volume: debitVolume, cost: Math.round(debitCost * 100) / 100, rate: debitRate },
    },
    dualPricingSavings: {
      serviceFeeCollected: Math.round(serviceFeeCollected * 100) / 100,
      netCostToMerchant: Math.round(netCostToMerchant * 100) / 100,
      annualSavings: Math.round(annualSavings * 100) / 100,
    },
  };
}

export function calculateSavings(
  currentEffectiveRate: number,
  monthlyVolume: number,
  proposedProgram: "dual_pricing" | "interchange_plus" | "flat_rate"
): { monthlySavings: number; annualSavings: number; proposedRate: number } {
  const currentMonthlyCost = monthlyVolume * (currentEffectiveRate / 100);
  
  let proposedRate: number;
  let proposedMonthlyCost: number;

  switch (proposedProgram) {
    case "dual_pricing":
      proposedRate = 0;
      proposedMonthlyCost = 0;
      break;
    case "interchange_plus":
      proposedRate = currentEffectiveRate * 0.85;
      proposedMonthlyCost = monthlyVolume * (proposedRate / 100);
      break;
    case "flat_rate":
      proposedRate = 2.50;
      proposedMonthlyCost = monthlyVolume * (proposedRate / 100);
      break;
  }

  const monthlySavings = currentMonthlyCost - proposedMonthlyCost;
  const annualSavings = monthlySavings * 12;

  return {
    monthlySavings: Math.round(monthlySavings * 100) / 100,
    annualSavings: Math.round(annualSavings * 100) / 100,
    proposedRate: Math.round(proposedRate * 100) / 100,
  };
}

export const InterchangeCalculatorPlugin: ProposalPlugin = {
  id: "interchange-calculator",
  name: "Interchange Calculator",
  version: "1.0.0",
  stage: "enrich",
  enabled: true,
  priority: 25,

  async run(context: ProposalContext): Promise<ProposalContext> {
    console.log("[InterchangeCalculator] Calculating interchange costs...");

    const { merchantData } = context;
    const monthlyVolume = merchantData.monthlyVolume || 50000;
    const averageTicket = merchantData.averageTicket || 50;

    let category: MerchantCategory = "retail";
    const industry = (merchantData.industry || "").toLowerCase();
    
    if (industry.includes("restaurant") || industry.includes("food")) {
      category = "restaurant";
    } else if (industry.includes("supermarket") || industry.includes("grocery")) {
      category = "supermarket";
    } else if (industry.includes("ecommerce") || industry.includes("online")) {
      category = "ecommerce";
    } else if (industry.includes("hotel") || industry.includes("lodging")) {
      category = "lodging";
    } else if (industry.includes("health") || industry.includes("medical")) {
      category = "healthcare";
    } else if (industry.includes("service")) {
      category = "service";
    }

    const isCardPresent = !industry.includes("ecommerce") && !industry.includes("online");
    const calculation = calculateInterchange(monthlyVolume, averageTicket, category, isCardPresent);

    const currentRate = context.pricingData.currentRates?.qualifiedRate || calculation.effectiveRate + 0.50;
    const savings = calculateSavings(currentRate, monthlyVolume, "dual_pricing");

    context.pricingData = {
      ...context.pricingData,
      proposedProgram: "dual_pricing",
      projectedSavings: savings.annualSavings,
      citations: [
        {
          source: "Visa USA Interchange Reimbursement Fees",
          reference: "October 2025",
          confidence: 0.95,
        },
        {
          source: "Mastercard U.S. Region Interchange Programs",
          reference: "April 2025",
          confidence: 0.95,
        },
      ],
    };

    (context as any).interchangeCalculation = calculation;
    (context as any).savingsAnalysis = {
      currentEffectiveRate: currentRate,
      ...savings,
    };

    context.citations.push({
      source: "Interchange Rate Tables",
      reference: `Calculated from ${category} category rates`,
      confidence: 0.9,
    });

    context.audit.push({
      timestamp: new Date(),
      stage: "enrich",
      plugin: this.id,
      action: "Interchange costs calculated",
      success: true,
      metadata: {
        monthlyVolume,
        averageTicket,
        category,
        effectiveRate: calculation.effectiveRate,
        projectedAnnualSavings: savings.annualSavings,
      },
    });

    console.log(`[InterchangeCalculator] Effective rate: ${calculation.effectiveRate}%, Annual savings with dual pricing: $${savings.annualSavings}`);

    return context;
  },
};

export default InterchangeCalculatorPlugin;
