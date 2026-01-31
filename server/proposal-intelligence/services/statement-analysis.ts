import { 
  VISA_RATES, 
  MASTERCARD_RATES, 
  DISCOVER_RATES, 
  AMEX_OPTBLUE_RATES,
  ASSESSMENT_FEES,
  DEFAULT_CARD_MIX,
  AVERAGE_RATES_BY_CATEGORY,
  type MerchantCategory,
  type CardMix
} from "../data/interchange-rates";

export interface StatementData {
  processorName?: string;
  merchantName?: string;
  merchantId?: string;
  statementPeriod?: { start: string; end: string };
  
  totalVolume: number;
  totalTransactions: number;
  averageTicket?: number;
  
  cardMix?: {
    visa?: { volume: number; transactions: number; fees?: number };
    mastercard?: { volume: number; transactions: number; fees?: number };
    discover?: { volume: number; transactions: number; fees?: number };
    amex?: { volume: number; transactions: number; fees?: number };
    debit?: { volume: number; transactions: number; fees?: number };
    pinDebit?: { volume: number; transactions: number; fees?: number };
  };
  
  fees: {
    interchange?: number;
    assessments?: number;
    processorMarkup?: number;
    monthlyFees?: number;
    pciFees?: number;
    equipmentFees?: number;
    otherFees?: number;
    totalFees: number;
    annual?: number;
  };
  
  qualificationBreakdown?: {
    qualified?: { volume: number; rate: number };
    midQualified?: { volume: number; rate: number };
    nonQualified?: { volume: number; rate: number };
  };
  
  merchantType?: MerchantCategory;
}

export interface TrueInterchangeCosts {
  trueInterchange: number;
  trueAssessments: number;
  trueWholesaleCost: number;
  trueWholesaleRate: number;
  breakdown: {
    visa: { interchange: number; assessment: number };
    mastercard: { interchange: number; assessment: number };
    discover: { interchange: number; assessment: number };
    amex: { interchange: number; assessment: number };
    debit: { interchange: number; assessment: number };
  };
}

export interface RedFlag {
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  issue: string;
  detail: string;
  savings: number;
  category: string;
}

export interface AnalysisResult {
  summary: {
    monthlyVolume: number;
    monthlyTransactions: number;
    averageTicket: number;
    currentTotalFees: number;
    currentEffectiveRate: number;
  };
  
  costAnalysis: {
    trueInterchange: number;
    trueAssessments: number;
    trueWholesale: number;
    trueWholesaleRate: number;
    processorMarkup: number;
    processorMarkupRate: number;
  };
  
  savings: {
    interchangePlus: {
      monthlyCost: number;
      effectiveRate: number;
      monthlySavings: number;
      annualSavings: number;
      description: string;
    };
    dualPricing: {
      monthlyCost: number;
      effectiveRate: number;
      monthlySavings: number;
      annualSavings: number;
      description: string;
    };
  };
  
  redFlags: RedFlag[];
  hiddenFees: HiddenFee[];
}

export interface HiddenFee {
  type: string;
  description: string;
  amount: number;
  recommendation: string;
}

function getAverageInterchangeRate(brand: string, merchantType: MerchantCategory, isCardPresent: boolean): { percent: number; fixed: number } {
  const categoryRates = AVERAGE_RATES_BY_CATEGORY[merchantType];
  const baseRate = isCardPresent ? categoryRates.cardPresent : categoryRates.cardNotPresent;
  
  switch (brand) {
    case 'visa':
      return { percent: baseRate, fixed: 0.10 };
    case 'mastercard':
      return { percent: baseRate * 0.96, fixed: 0.10 };
    case 'discover':
      return { percent: baseRate * 0.92, fixed: 0.10 };
    case 'amex':
      return { percent: baseRate * 1.15, fixed: 0.10 };
    case 'debit':
      return { percent: 0.80, fixed: 0.15 };
    case 'debitRegulated':
      return { percent: 0.05, fixed: 0.21 };
    default:
      return { percent: baseRate, fixed: 0.10 };
  }
}

export function calculateTrueInterchange(data: StatementData): TrueInterchangeCosts {
  const { totalVolume, totalTransactions, merchantType = 'retail' } = data;
  
  const mix = data.cardMix ? {
    visa: { percent: (data.cardMix.visa?.volume || 0) / totalVolume * 100, debitRatio: 0 },
    mastercard: { percent: (data.cardMix.mastercard?.volume || 0) / totalVolume * 100, debitRatio: 0 },
    discover: { percent: (data.cardMix.discover?.volume || 0) / totalVolume * 100, debitRatio: 0 },
    amex: { percent: (data.cardMix.amex?.volume || 0) / totalVolume * 100, debitRatio: 0 },
    debit: { percent: ((data.cardMix.debit?.volume || 0) + (data.cardMix.pinDebit?.volume || 0)) / totalVolume * 100, debitRatio: 1 },
  } : {
    visa: { percent: 40, debitRatio: 0.30 },
    mastercard: { percent: 30, debitRatio: 0.30 },
    discover: { percent: 10, debitRatio: 0.20 },
    amex: { percent: 15, debitRatio: 0 },
    debit: { percent: 5, debitRatio: 1 }
  };

  let totalInterchange = 0;
  let totalAssessments = 0;
  const breakdown: TrueInterchangeCosts['breakdown'] = {
    visa: { interchange: 0, assessment: 0 },
    mastercard: { interchange: 0, assessment: 0 },
    discover: { interchange: 0, assessment: 0 },
    amex: { interchange: 0, assessment: 0 },
    debit: { interchange: 0, assessment: 0 },
  };

  const assessmentRates: Record<string, number> = {
    visa: 0.13,
    mastercard: 0.13,
    discover: 0.13,
    amex: 0.15,
    debit: 0.05
  };

  Object.entries(mix).forEach(([brand, brandMix]) => {
    const brandVolume = totalVolume * (brandMix.percent / 100);
    const brandTxns = totalTransactions * (brandMix.percent / 100);

    if (brandVolume > 0) {
      const debitVolume = brandVolume * (brandMix.debitRatio || 0);
      const creditVolume = brandVolume - debitVolume;
      const debitTxns = brandTxns * (brandMix.debitRatio || 0);
      const creditTxns = brandTxns - debitTxns;

      let interchangeFee = 0;
      
      if (debitVolume > 0) {
        const regulatedRatio = 0.6;
        const regulatedVolume = debitVolume * regulatedRatio;
        const unregulatedVolume = debitVolume * (1 - regulatedRatio);
        const regulatedTxns = debitTxns * regulatedRatio;
        const unregulatedTxns = debitTxns * (1 - regulatedRatio);
        
        interchangeFee += (regulatedVolume * 0.05 / 100) + (regulatedTxns * 0.21);
        interchangeFee += (unregulatedVolume * 0.80 / 100) + (unregulatedTxns * 0.15);
      }
      
      if (creditVolume > 0) {
        const rates = getAverageInterchangeRate(brand, merchantType, true);
        interchangeFee += (creditVolume * rates.percent / 100) + (creditTxns * rates.fixed);
      }

      const assessmentFee = brandVolume * (assessmentRates[brand] || 0.13) / 100;

      totalInterchange += interchangeFee;
      totalAssessments += assessmentFee;
      
      if (brand in breakdown) {
        breakdown[brand as keyof typeof breakdown] = {
          interchange: Math.round(interchangeFee * 100) / 100,
          assessment: Math.round(assessmentFee * 100) / 100
        };
      }
    }
  });

  return {
    trueInterchange: Math.round(totalInterchange * 100) / 100,
    trueAssessments: Math.round(totalAssessments * 100) / 100,
    trueWholesaleCost: Math.round((totalInterchange + totalAssessments) * 100) / 100,
    trueWholesaleRate: Math.round(((totalInterchange + totalAssessments) / totalVolume) * 10000) / 100,
    breakdown
  };
}

export function identifyRedFlags(data: StatementData, trueCosts: TrueInterchangeCosts, markup: number): RedFlag[] {
  const flags: RedFlag[] = [];
  const { totalVolume, fees } = data;
  const effectiveRate = (fees.totalFees / totalVolume) * 100;

  if (effectiveRate > 3.5) {
    flags.push({
      severity: 'HIGH',
      issue: 'Extremely high effective rate',
      detail: `${effectiveRate.toFixed(2)}% is well above industry average of 2.5%`,
      savings: Math.round((effectiveRate - 2.5) / 100 * totalVolume * 100) / 100,
      category: 'rate'
    });
  } else if (effectiveRate > 3.0) {
    flags.push({
      severity: 'HIGH',
      issue: 'Very high effective rate',
      detail: `${effectiveRate.toFixed(2)}% is significantly above industry average`,
      savings: Math.round((effectiveRate - 2.5) / 100 * totalVolume * 100) / 100,
      category: 'rate'
    });
  } else if (effectiveRate > 2.5) {
    flags.push({
      severity: 'MEDIUM',
      issue: 'Above-average effective rate',
      detail: `${effectiveRate.toFixed(2)}% is higher than typical ${data.merchantType || 'retail'} rate`,
      savings: Math.round((effectiveRate - 2.0) / 100 * totalVolume * 100) / 100,
      category: 'rate'
    });
  }

  if (markup > trueCosts.trueWholesaleCost * 0.5) {
    flags.push({
      severity: 'HIGH',
      issue: 'Excessive processor markup',
      detail: `Processor is adding ${((markup / totalVolume) * 100).toFixed(2)}% above wholesale cost`,
      savings: Math.round(markup * 0.6 * 100) / 100,
      category: 'markup'
    });
  } else if (markup > trueCosts.trueWholesaleCost * 0.3) {
    flags.push({
      severity: 'MEDIUM',
      issue: 'High processor markup',
      detail: `Processor markup of ${((markup / totalVolume) * 100).toFixed(2)}% is above competitive rates`,
      savings: Math.round(markup * 0.4 * 100) / 100,
      category: 'markup'
    });
  }

  if (fees.pciFees && fees.pciFees > 25) {
    flags.push({
      severity: 'MEDIUM',
      issue: 'High PCI compliance fee',
      detail: `$${fees.pciFees} PCI fee is excessive. PCBancard includes PCI compliance.`,
      savings: fees.pciFees,
      category: 'fee'
    });
  }

  if (fees.monthlyFees && fees.monthlyFees > 25) {
    flags.push({
      severity: 'LOW',
      issue: 'High monthly fee',
      detail: `$${fees.monthlyFees} monthly fee could be reduced`,
      savings: Math.round((fees.monthlyFees - 10) * 100) / 100,
      category: 'fee'
    });
  }

  if (fees.annual && fees.annual > 0) {
    flags.push({
      severity: 'MEDIUM',
      issue: 'Annual fee charged',
      detail: `$${fees.annual} annual fee is unnecessary`,
      savings: Math.round(fees.annual / 12 * 100) / 100,
      category: 'fee'
    });
  }

  if (fees.equipmentFees && fees.equipmentFees > 50) {
    flags.push({
      severity: 'MEDIUM',
      issue: 'Equipment lease detected',
      detail: `$${fees.equipmentFees}/month equipment lease. PCBancard offers free terminals with dual pricing.`,
      savings: fees.equipmentFees,
      category: 'equipment'
    });
  }

  if (fees.otherFees && fees.otherFees > 50) {
    flags.push({
      severity: 'MEDIUM',
      issue: 'Unexplained fees',
      detail: `$${fees.otherFees} in unexplained "other" fees require itemized breakdown`,
      savings: Math.round(fees.otherFees * 0.5 * 100) / 100,
      category: 'hidden'
    });
  }

  if (data.qualificationBreakdown) {
    const { nonQualified, midQualified } = data.qualificationBreakdown;
    if (nonQualified && nonQualified.volume > totalVolume * 0.1) {
      flags.push({
        severity: 'HIGH',
        issue: 'High non-qualified transactions',
        detail: `${((nonQualified.volume / totalVolume) * 100).toFixed(1)}% of volume at non-qualified rates (${nonQualified.rate}%)`,
        savings: Math.round(nonQualified.volume * 0.01 * 100) / 100,
        category: 'downgrade'
      });
    }
    if (midQualified && midQualified.volume > totalVolume * 0.2) {
      flags.push({
        severity: 'MEDIUM',
        issue: 'High mid-qualified transactions',
        detail: `${((midQualified.volume / totalVolume) * 100).toFixed(1)}% of volume at mid-qualified rates`,
        savings: Math.round(midQualified.volume * 0.005 * 100) / 100,
        category: 'downgrade'
      });
    }
  }

  return flags.sort((a, b) => {
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

export function detectHiddenFees(data: StatementData): HiddenFee[] {
  const hiddenFees: HiddenFee[] = [];
  const { fees } = data;

  if (fees.otherFees && fees.otherFees > 50) {
    hiddenFees.push({
      type: 'UNEXPLAINED_FEES',
      description: 'Statement contains unexplained "other" fees',
      amount: fees.otherFees,
      recommendation: 'Request itemized breakdown of all fees'
    });
  }

  if (fees.pciFees && fees.pciFees > 0) {
    if (fees.pciFees >= 99) {
      hiddenFees.push({
        type: 'PCI_NON_COMPLIANCE',
        description: 'PCI non-compliance penalty detected',
        amount: fees.pciFees,
        recommendation: 'Help merchant complete PCI compliance questionnaire'
      });
    } else if (fees.pciFees > 15) {
      hiddenFees.push({
        type: 'HIGH_PCI_FEE',
        description: 'PCI fee above industry standard',
        amount: fees.pciFees - 10,
        recommendation: 'PCBancard includes PCI compliance at no extra cost'
      });
    }
  }

  return hiddenFees;
}

export interface ICPlusMargin {
  ratePercent: number;
  perTxnFee: number;
  monthlyFee: number;
}

export function analyzeStatement(
  data: StatementData, 
  icPlusMargin: ICPlusMargin = { ratePercent: 0.50, perTxnFee: 0.10, monthlyFee: 10 },
  dualPricingMonthlyCost: number = 64.95
): AnalysisResult {
  const trueCosts = calculateTrueInterchange(data);
  const { totalVolume, totalTransactions, fees } = data;
  
  const averageTicket = data.averageTicket || (totalVolume / totalTransactions);
  const effectiveRate = (fees.totalFees / totalVolume) * 100;
  const processorMarkup = fees.totalFees - trueCosts.trueWholesaleCost;
  const markupRate = (processorMarkup / totalVolume) * 100;

  const pcbInterchangePlusCost = 
    trueCosts.trueWholesaleCost + 
    (totalVolume * icPlusMargin.ratePercent / 100) + 
    (totalTransactions * icPlusMargin.perTxnFee) + 
    icPlusMargin.monthlyFee;

  const pcbDualPricingCost = dualPricingMonthlyCost;

  const redFlags = identifyRedFlags(data, trueCosts, processorMarkup);
  const hiddenFees = detectHiddenFees(data);

  const icPlusDescription = `Interchange + ${icPlusMargin.ratePercent.toFixed(2)}% + $${icPlusMargin.perTxnFee.toFixed(2)}/txn + $${icPlusMargin.monthlyFee} monthly`;

  return {
    summary: {
      monthlyVolume: totalVolume,
      monthlyTransactions: totalTransactions,
      averageTicket: Math.round(averageTicket * 100) / 100,
      currentTotalFees: Math.round(fees.totalFees * 100) / 100,
      currentEffectiveRate: Math.round(effectiveRate * 100) / 100
    },
    
    costAnalysis: {
      trueInterchange: trueCosts.trueInterchange,
      trueAssessments: trueCosts.trueAssessments,
      trueWholesale: trueCosts.trueWholesaleCost,
      trueWholesaleRate: trueCosts.trueWholesaleRate,
      processorMarkup: Math.round(processorMarkup * 100) / 100,
      processorMarkupRate: Math.round(markupRate * 100) / 100
    },
    
    savings: {
      interchangePlus: {
        monthlyCost: Math.round(pcbInterchangePlusCost * 100) / 100,
        effectiveRate: Math.round((pcbInterchangePlusCost / totalVolume) * 10000) / 100,
        monthlySavings: Math.round((fees.totalFees - pcbInterchangePlusCost) * 100) / 100,
        annualSavings: Math.round((fees.totalFees - pcbInterchangePlusCost) * 12 * 100) / 100,
        description: icPlusDescription
      },
      dualPricing: {
        monthlyCost: pcbDualPricingCost,
        effectiveRate: Math.round((pcbDualPricingCost / totalVolume) * 10000) / 100,
        monthlySavings: Math.round((fees.totalFees - pcbDualPricingCost) * 100) / 100,
        annualSavings: Math.round((fees.totalFees - pcbDualPricingCost) * 12 * 100) / 100,
        description: `Customer pays 3.99% service fee, merchant pays $${pcbDualPricingCost.toFixed(2)}/mo`
      }
    },
    
    redFlags,
    hiddenFees
  };
}
