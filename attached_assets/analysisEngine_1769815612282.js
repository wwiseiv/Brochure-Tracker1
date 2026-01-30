// Statement Analysis Engine
// Compares merchant's actual fees against true interchange costs

import { 
  interchangeRates, 
  assessmentFees, 
  averageRates, 
  typicalCardMix,
  pcbancardPricing,
  junkFees 
} from '../data/interchangeRates.js';

/**
 * Calculate true interchange cost based on volume and card mix
 */
export function calculateTrueInterchange(data) {
  const { 
    volume, 
    transactions, 
    merchantType = 'retail',
    cardMix = null 
  } = data;

  // Use provided card mix or typical mix for merchant type
  const mix = cardMix || typicalCardMix[merchantType] || typicalCardMix.retail;
  
  let totalInterchange = 0;
  let totalAssessments = 0;
  const breakdown = [];

  // Calculate for each card brand
  Object.entries(mix).forEach(([brand, brandMix]) => {
    if (brand === 'other') return; // Skip 'other' for simplicity
    
    const brandVolume = volume * (brandMix.percent / 100);
    const brandTxns = transactions * (brandMix.percent / 100);
    
    // Split between debit and credit
    const debitRatio = brandMix.debitRatio || 0;
    const debitVolume = brandVolume * debitRatio;
    const creditVolume = brandVolume * (1 - debitRatio);
    const debitTxns = brandTxns * debitRatio;
    const creditTxns = brandTxns * (1 - debitRatio);

    let brandInterchange = 0;

    // Debit interchange (regulated rate - most common)
    if (debitVolume > 0) {
      const debitRate = averageRates.debitRegulated;
      const debitFee = (debitVolume * debitRate.percent / 100) + (debitTxns * debitRate.fixed);
      brandInterchange += debitFee;
      
      breakdown.push({
        brand,
        type: 'Debit',
        volume: debitVolume,
        transactions: debitTxns,
        rate: `${debitRate.percent}% + $${debitRate.fixed}`,
        fee: debitFee
      });
    }

    // Credit interchange
    if (creditVolume > 0) {
      // Use blended average for the brand
      let creditRate;
      if (brand === 'amex') {
        creditRate = averageRates.amex;
      } else {
        creditRate = averageRates.creditRewards; // Most cards are rewards
      }
      
      const creditFee = (creditVolume * creditRate.percent / 100) + (creditTxns * creditRate.fixed);
      brandInterchange += creditFee;
      
      breakdown.push({
        brand,
        type: 'Credit',
        volume: creditVolume,
        transactions: creditTxns,
        rate: `${creditRate.percent}% + $${creditRate.fixed}`,
        fee: creditFee
      });
    }

    totalInterchange += brandInterchange;

    // Assessment fees (on all volume)
    const assessRate = assessmentFees[brand] || 0.13;
    const assessment = brandVolume * (assessRate / 100);
    totalAssessments += assessment;
  });

  const wholesaleCost = totalInterchange + totalAssessments;
  const wholesaleRate = (wholesaleCost / volume) * 100;

  return {
    interchange: totalInterchange,
    assessments: totalAssessments,
    wholesaleCost,
    wholesaleRate,
    breakdown
  };
}

/**
 * Analyze a merchant's statement and identify savings
 */
export function analyzeStatement(statementData) {
  const {
    volume,
    transactions,
    totalFees,
    merchantType = 'retail',
    currentProcessor = 'Unknown',
    fees = {}
  } = statementData;

  // Calculate true interchange cost
  const trueCosts = calculateTrueInterchange({
    volume,
    transactions,
    merchantType
  });

  // Current effective rate
  const currentEffectiveRate = (totalFees / volume) * 100;
  const averageTicket = volume / transactions;

  // Processor markup calculation
  const processorMarkup = totalFees - trueCosts.wholesaleCost;
  const markupRate = (processorMarkup / volume) * 100;

  // Calculate PCBancard pricing options
  const pcbInterchangePlus = calculateICPlusCost(volume, transactions, trueCosts);
  const pcbDualPricing = calculateDualPricingCost(volume);

  // Identify red flags
  const redFlags = identifyRedFlags(statementData, trueCosts, processorMarkup, currentEffectiveRate);

  // Identify potential junk fees
  const junkFeesFound = identifyJunkFees(fees);

  return {
    // Input summary
    input: {
      volume,
      transactions,
      averageTicket,
      totalFees,
      merchantType,
      currentProcessor
    },

    // Current state
    current: {
      effectiveRate: currentEffectiveRate,
      totalFees
    },

    // True costs
    trueCosts: {
      interchange: trueCosts.interchange,
      assessments: trueCosts.assessments,
      wholesale: trueCosts.wholesaleCost,
      wholesaleRate: trueCosts.wholesaleRate,
      breakdown: trueCosts.breakdown
    },

    // Markup analysis
    markup: {
      amount: processorMarkup,
      rate: markupRate,
      percentOfFees: (processorMarkup / totalFees) * 100
    },

    // PCBancard options
    pcbancard: {
      interchangePlus: pcbInterchangePlus,
      dualPricing: pcbDualPricing,
      recommended: pcbDualPricing.monthlySavings > pcbInterchangePlus.monthlySavings 
        ? 'dualPricing' 
        : 'interchangePlus'
    },

    // Issues found
    redFlags,
    junkFees: junkFeesFound,

    // Summary
    summary: {
      totalMonthlyOvercharge: processorMarkup,
      totalAnnualOvercharge: processorMarkup * 12,
      maxMonthlySavings: Math.max(pcbInterchangePlus.monthlySavings, pcbDualPricing.monthlySavings),
      maxAnnualSavings: Math.max(pcbInterchangePlus.annualSavings, pcbDualPricing.annualSavings)
    }
  };
}

/**
 * Calculate Interchange Plus pricing
 */
function calculateICPlusCost(volume, transactions, trueCosts) {
  const pricing = pcbancardPricing.interchangePlus;
  
  const markupFee = volume * (pricing.markup / 100);
  const transactionFee = transactions * pricing.perTransaction;
  const monthlyFees = pricing.monthlyFee + pricing.pciFee + pricing.statementFee;
  
  const totalCost = trueCosts.wholesaleCost + markupFee + transactionFee + monthlyFees;
  const effectiveRate = (totalCost / volume) * 100;

  return {
    wholesaleCost: trueCosts.wholesaleCost,
    markup: markupFee,
    transactionFees: transactionFee,
    monthlyFees,
    totalCost,
    effectiveRate,
    monthlySavings: 0, // Will be calculated by caller
    annualSavings: 0
  };
}

/**
 * Calculate Dual Pricing cost
 */
function calculateDualPricingCost(volume) {
  const pricing = pcbancardPricing.dualPricing;
  
  // Merchant only pays monthly fees - customers pay the service fee
  const totalCost = pricing.monthlyFee + pricing.portalFee + pricing.terminalWarranty;
  const effectiveRate = (totalCost / volume) * 100;

  return {
    monthlyFees: totalCost,
    serviceFeeToCustomer: pricing.serviceFee,
    totalCost,
    effectiveRate,
    monthlySavings: 0, // Will be calculated by caller
    annualSavings: 0,
    note: `Customers pay ${pricing.serviceFee}% service fee for card transactions`
  };
}

/**
 * Identify red flags in the statement
 */
function identifyRedFlags(data, trueCosts, markup, effectiveRate) {
  const flags = [];
  const { volume, fees = {} } = data;

  // High effective rate
  if (effectiveRate > 3.5) {
    flags.push({
      severity: 'CRITICAL',
      type: 'HIGH_RATE',
      title: 'Extremely High Effective Rate',
      detail: `${effectiveRate.toFixed(2)}% is well above the industry average of 2.5%`,
      impact: ((effectiveRate - 2.5) / 100 * volume),
      suggestion: 'This merchant is being significantly overcharged'
    });
  } else if (effectiveRate > 2.8) {
    flags.push({
      severity: 'HIGH',
      type: 'HIGH_RATE',
      title: 'Above Average Effective Rate',
      detail: `${effectiveRate.toFixed(2)}% is higher than typical rates`,
      impact: ((effectiveRate - 2.2) / 100 * volume),
      suggestion: 'Rate reduction is definitely possible'
    });
  }

  // Excessive markup
  const markupPercent = (markup / volume) * 100;
  if (markupPercent > 1.0) {
    flags.push({
      severity: 'HIGH',
      type: 'EXCESSIVE_MARKUP',
      title: 'Excessive Processor Markup',
      detail: `Processor is adding ${markupPercent.toFixed(2)}% above interchange`,
      impact: markup * 0.7, // Assume 70% is recoverable
      suggestion: 'This markup is much higher than industry standard (0.20-0.50%)'
    });
  } else if (markupPercent > 0.5) {
    flags.push({
      severity: 'MEDIUM',
      type: 'HIGH_MARKUP',
      title: 'High Processor Markup',
      detail: `Markup of ${markupPercent.toFixed(2)}% is above competitive rates`,
      impact: (markupPercent - 0.25) / 100 * volume,
      suggestion: 'Room for significant savings'
    });
  }

  // Check for tiered pricing indicators
  if (fees.midQualified || fees.nonQualified) {
    flags.push({
      severity: 'HIGH',
      type: 'TIERED_PRICING',
      title: 'Tiered Pricing Detected',
      detail: 'Merchant is on tiered pricing which typically costs more',
      impact: volume * 0.005, // Estimate 0.5% extra
      suggestion: 'Switch to interchange-plus for transparency and savings'
    });
  }

  // PCI fee check
  if (fees.pci > 15) {
    flags.push({
      severity: 'MEDIUM',
      type: 'PCI_FEE',
      title: 'High PCI Compliance Fee',
      detail: `$${fees.pci} PCI fee is excessive`,
      impact: fees.pci,
      suggestion: 'PCBancard includes PCI compliance assistance at no extra cost'
    });
  }

  // Check for annual fee
  if (fees.annual > 0) {
    flags.push({
      severity: 'MEDIUM',
      type: 'ANNUAL_FEE',
      title: 'Annual Fee Charged',
      detail: `$${fees.annual} annual fee`,
      impact: fees.annual / 12,
      suggestion: 'PCBancard does not charge annual fees'
    });
  }

  return flags;
}

/**
 * Identify junk fees in the fee breakdown
 */
function identifyJunkFees(fees) {
  const found = [];

  junkFees.forEach(junkFee => {
    const feeKey = junkFee.name.toLowerCase().replace(/\s+/g, '');
    const amount = fees[feeKey] || fees[junkFee.name] || 0;

    if (amount > junkFee.max) {
      found.push({
        name: junkFee.name,
        amount,
        typical: junkFee.typical,
        excess: amount - junkFee.typical,
        isWarning: junkFee.warning || false
      });
    }
  });

  return found;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercent(value, decimals = 2) {
  return `${value.toFixed(decimals)}%`;
}
