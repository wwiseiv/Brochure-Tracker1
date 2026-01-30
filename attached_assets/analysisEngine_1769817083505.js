// Statement Analysis Engine
// Calculates true interchange costs, markup, and PCBancard savings

import { typicalCardMix, pcbancardPricing } from '../data/interchangeRates.js';

/**
 * Calculate true interchange cost based on volume and card mix
 */
export function calculateTrueInterchange(data) {
  const { 
    volume, 
    transactions, 
    merchantType = 'retail',
    // Use actual card breakdown if available
    visaVolume,
    mastercardVolume,
    discoverVolume,
    amexVolume,
    debitVolume
  } = data;

  // If we have actual card volumes, use them
  const hasActualVolumes = visaVolume || mastercardVolume || discoverVolume || amexVolume;
  
  let mix;
  if (hasActualVolumes) {
    const totalKnown = (visaVolume || 0) + (mastercardVolume || 0) + (discoverVolume || 0) + (amexVolume || 0);
    const debitRatio = debitVolume ? debitVolume / totalKnown : 0.30;
    
    mix = {
      visa: ((visaVolume || 0) / volume) * 100 || 40,
      mastercard: ((mastercardVolume || 0) / volume) * 100 || 28,
      discover: ((discoverVolume || 0) / volume) * 100 || 8,
      amex: ((amexVolume || 0) / volume) * 100 || 18,
      debitRatio
    };
  } else {
    mix = typicalCardMix[merchantType] || typicalCardMix.retail;
  }

  let totalInterchange = 0;
  let totalAssessments = 0;
  const breakdown = [];

  // Visa
  const visaVol = volume * (mix.visa / 100);
  const visaTxns = transactions * (mix.visa / 100);
  const visaDebitVol = visaVol * mix.debitRatio;
  const visaCreditVol = visaVol * (1 - mix.debitRatio);
  const visaDebitTxns = visaTxns * mix.debitRatio;
  const visaCreditTxns = visaTxns * (1 - mix.debitRatio);
  
  // Debit: 0.05% + $0.21
  const visaDebitIC = (visaDebitVol * 0.0005) + (visaDebitTxns * 0.21);
  // Credit: ~1.95% + $0.10 (blended rewards)
  const visaCreditIC = (visaCreditVol * 0.0195) + (visaCreditTxns * 0.10);
  const visaAssess = visaVol * 0.0013;
  
  totalInterchange += visaDebitIC + visaCreditIC;
  totalAssessments += visaAssess;
  
  breakdown.push({
    brand: 'Visa',
    volume: visaVol,
    transactions: visaTxns,
    interchange: visaDebitIC + visaCreditIC,
    assessments: visaAssess
  });

  // Mastercard
  const mcVol = volume * (mix.mastercard / 100);
  const mcTxns = transactions * (mix.mastercard / 100);
  const mcDebitVol = mcVol * mix.debitRatio;
  const mcCreditVol = mcVol * (1 - mix.debitRatio);
  const mcDebitTxns = mcTxns * mix.debitRatio;
  const mcCreditTxns = mcTxns * (1 - mix.debitRatio);
  
  const mcDebitIC = (mcDebitVol * 0.0005) + (mcDebitTxns * 0.21);
  const mcCreditIC = (mcCreditVol * 0.0185) + (mcCreditTxns * 0.10);
  const mcAssess = mcVol * 0.0013;
  
  totalInterchange += mcDebitIC + mcCreditIC;
  totalAssessments += mcAssess;
  
  breakdown.push({
    brand: 'Mastercard',
    volume: mcVol,
    transactions: mcTxns,
    interchange: mcDebitIC + mcCreditIC,
    assessments: mcAssess
  });

  // Discover
  const discVol = volume * (mix.discover / 100);
  const discTxns = transactions * (mix.discover / 100);
  const discIC = (discVol * 0.0171) + (discTxns * 0.10);
  const discAssess = discVol * 0.0013;
  
  totalInterchange += discIC;
  totalAssessments += discAssess;
  
  breakdown.push({
    brand: 'Discover',
    volume: discVol,
    transactions: discTxns,
    interchange: discIC,
    assessments: discAssess
  });

  // Amex
  const amexVol = volume * (mix.amex / 100);
  const amexTxns = transactions * (mix.amex / 100);
  const amexIC = (amexVol * 0.02) + (amexTxns * 0.10);
  const amexAssess = amexVol * 0.0015;
  
  totalInterchange += amexIC;
  totalAssessments += amexAssess;
  
  breakdown.push({
    brand: 'Amex',
    volume: amexVol,
    transactions: amexTxns,
    interchange: amexIC,
    assessments: amexAssess
  });

  const wholesaleCost = totalInterchange + totalAssessments;
  const wholesaleRate = (wholesaleCost / volume) * 100;

  return {
    interchange: totalInterchange,
    assessments: totalAssessments,
    wholesale: wholesaleCost,
    wholesaleRate,
    breakdown,
    cardMix: mix
  };
}

/**
 * Analyze statement and calculate savings
 */
export function analyzeStatement(data) {
  const {
    totalVolume,
    totalTransactions,
    totalFees,
    merchantType = 'retail',
    processor = 'Unknown',
    pricingType,
    // Optional detailed fees
    monthlyFee = 0,
    pciFee = 0,
    statementFee = 0,
    otherFees = 0
  } = data;

  // Validate required fields
  if (!totalVolume || !totalTransactions || !totalFees) {
    return {
      error: 'Missing required fields: volume, transactions, or fees',
      success: false
    };
  }

  // Calculate true interchange
  const trueCosts = calculateTrueInterchange({
    volume: totalVolume,
    transactions: totalTransactions,
    merchantType,
    ...data // Pass through any card-level data
  });

  // Current effective rate
  const currentEffectiveRate = (totalFees / totalVolume) * 100;
  const averageTicket = totalVolume / totalTransactions;

  // Processor markup
  const processorMarkup = totalFees - trueCosts.wholesale;
  const markupRate = (processorMarkup / totalVolume) * 100;

  // PCBancard Interchange Plus pricing
  const icPlusMarkup = totalVolume * (pcbancardPricing.interchangePlus.markup / 100);
  const icPlusTxnFees = totalTransactions * pcbancardPricing.interchangePlus.perTransaction;
  const icPlusMonthly = pcbancardPricing.interchangePlus.monthlyFee;
  const icPlusTotal = trueCosts.wholesale + icPlusMarkup + icPlusTxnFees + icPlusMonthly;
  const icPlusRate = (icPlusTotal / totalVolume) * 100;
  const icPlusSavings = totalFees - icPlusTotal;

  // PCBancard Dual Pricing
  const dualPricingTotal = pcbancardPricing.dualPricing.monthlyFee;
  const dualPricingRate = (dualPricingTotal / totalVolume) * 100;
  const dualPricingSavings = totalFees - dualPricingTotal;

  // Identify red flags
  const redFlags = [];

  if (currentEffectiveRate > 3.5) {
    redFlags.push({
      severity: 'CRITICAL',
      type: 'HIGH_RATE',
      title: 'Extremely High Effective Rate',
      detail: `${currentEffectiveRate.toFixed(2)}% is well above industry average of 2.5%`,
      impact: ((currentEffectiveRate - 2.5) / 100) * totalVolume
    });
  } else if (currentEffectiveRate > 2.8) {
    redFlags.push({
      severity: 'HIGH',
      type: 'HIGH_RATE',
      title: 'Above Average Effective Rate',
      detail: `${currentEffectiveRate.toFixed(2)}% is higher than typical`,
      impact: ((currentEffectiveRate - 2.2) / 100) * totalVolume
    });
  }

  if (markupRate > 1.0) {
    redFlags.push({
      severity: 'HIGH',
      type: 'EXCESSIVE_MARKUP',
      title: 'Excessive Processor Markup',
      detail: `${markupRate.toFixed(2)}% markup is much higher than competitive rates`,
      impact: processorMarkup * 0.7
    });
  } else if (markupRate > 0.5) {
    redFlags.push({
      severity: 'MEDIUM',
      type: 'HIGH_MARKUP',
      title: 'High Processor Markup',
      detail: `${markupRate.toFixed(2)}% markup above competitive rates`,
      impact: ((markupRate - 0.25) / 100) * totalVolume
    });
  }

  if (pricingType === 'tiered') {
    redFlags.push({
      severity: 'HIGH',
      type: 'TIERED_PRICING',
      title: 'Tiered Pricing Detected',
      detail: 'Tiered pricing is typically more expensive and less transparent',
      impact: totalVolume * 0.005
    });
  }

  if (pciFee > 15) {
    redFlags.push({
      severity: 'MEDIUM',
      type: 'PCI_FEE',
      title: 'High PCI Fee',
      detail: `$${pciFee} PCI fee is excessive`,
      impact: pciFee
    });
  }

  if (monthlyFee > 25) {
    redFlags.push({
      severity: 'MEDIUM',
      type: 'MONTHLY_FEE',
      title: 'High Monthly Fee',
      detail: `$${monthlyFee} monthly fee is above average`,
      impact: monthlyFee - 10
    });
  }

  // Determine recommended program
  const recommended = dualPricingSavings > icPlusSavings ? 'dualPricing' : 'interchangePlus';

  return {
    success: true,
    
    input: {
      volume: totalVolume,
      transactions: totalTransactions,
      totalFees,
      averageTicket,
      merchantType,
      processor,
      pricingType
    },

    current: {
      effectiveRate: currentEffectiveRate,
      totalFees
    },

    trueCosts: {
      interchange: trueCosts.interchange,
      assessments: trueCosts.assessments,
      wholesale: trueCosts.wholesale,
      wholesaleRate: trueCosts.wholesaleRate,
      breakdown: trueCosts.breakdown,
      cardMix: trueCosts.cardMix
    },

    markup: {
      amount: processorMarkup,
      rate: markupRate,
      percentOfFees: (processorMarkup / totalFees) * 100
    },

    pcbancard: {
      interchangePlus: {
        wholesale: trueCosts.wholesale,
        markup: icPlusMarkup,
        transactionFees: icPlusTxnFees,
        monthlyFees: icPlusMonthly,
        total: icPlusTotal,
        rate: icPlusRate,
        savings: icPlusSavings,
        annualSavings: icPlusSavings * 12
      },
      dualPricing: {
        monthlyFees: dualPricingTotal,
        serviceFee: pcbancardPricing.dualPricing.serviceFee,
        total: dualPricingTotal,
        rate: dualPricingRate,
        savings: dualPricingSavings,
        annualSavings: dualPricingSavings * 12
      },
      recommended
    },

    redFlags,

    summary: {
      maxMonthlySavings: Math.max(icPlusSavings, dualPricingSavings),
      maxAnnualSavings: Math.max(icPlusSavings, dualPricingSavings) * 12,
      markupOvercharge: processorMarkup
    }
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatCurrencyExact(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}
