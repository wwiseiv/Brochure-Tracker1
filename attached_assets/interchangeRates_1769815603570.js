// Interchange rates database - Updated 2024-2025
// These are wholesale costs set by Visa, Mastercard, Discover, and Amex

export const interchangeRates = {
  // VISA INTERCHANGE RATES
  visa: {
    retail: {
      debitRegulated: { percent: 0.05, fixed: 0.21, name: 'Regulated Debit (Durbin)' },
      debitUnregulated: { percent: 0.80, fixed: 0.15, name: 'Unregulated Debit' },
      cpsRetail: { percent: 1.65, fixed: 0.10, name: 'CPS Retail' },
      rewards1: { percent: 1.65, fixed: 0.10, name: 'Rewards 1' },
      rewards2: { percent: 1.95, fixed: 0.10, name: 'Rewards 2' },
      signaturePreferred: { percent: 2.10, fixed: 0.10, name: 'Signature Preferred' },
      infinite: { percent: 2.30, fixed: 0.10, name: 'Visa Infinite' },
      commercial: { percent: 2.50, fixed: 0.10, name: 'Commercial/Corporate' },
      eirf: { percent: 2.70, fixed: 0.10, name: 'EIRF (Downgrade)' }
    },
    restaurant: {
      cpsRestaurant: { percent: 1.54, fixed: 0.10, name: 'CPS Restaurant' },
      debit: { percent: 0.80, fixed: 0.15, name: 'Restaurant Debit' }
    },
    ecommerce: {
      basic: { percent: 1.80, fixed: 0.10, name: 'E-Commerce Basic' },
      preferred: { percent: 1.95, fixed: 0.10, name: 'E-Commerce Preferred' },
      standard: { percent: 2.70, fixed: 0.10, name: 'Standard CNP' }
    },
    supermarket: {
      cps: { percent: 1.22, fixed: 0.05, name: 'CPS Supermarket' },
      debit: { percent: 0.80, fixed: 0.15, name: 'Supermarket Debit' }
    }
  },

  // MASTERCARD INTERCHANGE RATES
  mastercard: {
    retail: {
      debitRegulated: { percent: 0.05, fixed: 0.21, name: 'Regulated Debit' },
      debitUnregulated: { percent: 0.80, fixed: 0.15, name: 'Unregulated Debit' },
      meritI: { percent: 1.58, fixed: 0.10, name: 'Merit I' },
      meritIII: { percent: 1.48, fixed: 0.05, name: 'Merit III (Supermarket)' },
      world: { percent: 1.73, fixed: 0.10, name: 'World' },
      worldElite: { percent: 2.05, fixed: 0.10, name: 'World Elite' },
      worldHighValue: { percent: 2.30, fixed: 0.10, name: 'World High Value' },
      commercial: { percent: 2.50, fixed: 0.10, name: 'Commercial' },
      standard: { percent: 2.65, fixed: 0.10, name: 'Standard (Downgrade)' }
    },
    restaurant: {
      restaurant: { percent: 1.47, fixed: 0.10, name: 'Restaurant' },
      qsr: { percent: 1.47, fixed: 0.05, name: 'Quick Service' }
    }
  },

  // DISCOVER INTERCHANGE RATES
  discover: {
    retail: {
      retail: { percent: 1.56, fixed: 0.10, name: 'Retail' },
      rewards: { percent: 1.71, fixed: 0.10, name: 'Rewards' },
      premiumPlus: { percent: 1.87, fixed: 0.10, name: 'Premium Plus' },
      premiumPlusRewards: { percent: 2.15, fixed: 0.10, name: 'Premium Plus Rewards' },
      debit: { percent: 0.80, fixed: 0.15, name: 'Debit' }
    },
    restaurant: {
      restaurant: { percent: 1.40, fixed: 0.10, name: 'Restaurant' },
      qsr: { percent: 1.40, fixed: 0.05, name: 'Quick Service' }
    },
    supermarket: {
      supermarket: { percent: 1.15, fixed: 0.05, name: 'Supermarket' }
    },
    ecommerce: {
      ecommerce: { percent: 1.81, fixed: 0.10, name: 'E-Commerce' },
      moto: { percent: 1.87, fixed: 0.10, name: 'MOTO' }
    }
  },

  // AMERICAN EXPRESS (OptBlue Program)
  amex: {
    retail: { percent: 2.00, fixed: 0.10, name: 'Retail OptBlue' },
    restaurant: { percent: 1.90, fixed: 0.10, name: 'Restaurant OptBlue' },
    ecommerce: { percent: 2.40, fixed: 0.10, name: 'E-Commerce OptBlue' },
    traditional: { percent: 2.89, fixed: 0.10, name: 'Traditional Direct' }
  }
};

// Assessment fees charged by card brands (on top of interchange)
export const assessmentFees = {
  visa: 0.13,        // 0.13% of volume
  mastercard: 0.13,  // 0.13% of volume
  discover: 0.13,    // 0.13% of volume
  amex: 0.15         // 0.15% of volume
};

// Average blended rates for quick estimates
export const averageRates = {
  debitRegulated: { percent: 0.05, fixed: 0.21 },
  debitUnregulated: { percent: 0.80, fixed: 0.15 },
  creditBasic: { percent: 1.65, fixed: 0.10 },
  creditRewards: { percent: 1.95, fixed: 0.10 },
  creditPremium: { percent: 2.20, fixed: 0.10 },
  commercial: { percent: 2.50, fixed: 0.10 },
  amex: { percent: 2.00, fixed: 0.10 }
};

// Typical card mix by merchant type
export const typicalCardMix = {
  retail: {
    visa: { percent: 40, debitRatio: 0.35 },
    mastercard: { percent: 28, debitRatio: 0.35 },
    discover: { percent: 8, debitRatio: 0.25 },
    amex: { percent: 18, debitRatio: 0 },
    other: { percent: 6, debitRatio: 0.50 }
  },
  restaurant: {
    visa: { percent: 42, debitRatio: 0.25 },
    mastercard: { percent: 30, debitRatio: 0.25 },
    discover: { percent: 6, debitRatio: 0.20 },
    amex: { percent: 18, debitRatio: 0 },
    other: { percent: 4, debitRatio: 0.40 }
  },
  ecommerce: {
    visa: { percent: 45, debitRatio: 0.20 },
    mastercard: { percent: 30, debitRatio: 0.20 },
    discover: { percent: 8, debitRatio: 0.15 },
    amex: { percent: 15, debitRatio: 0 },
    other: { percent: 2, debitRatio: 0.30 }
  },
  service: {
    visa: { percent: 38, debitRatio: 0.30 },
    mastercard: { percent: 28, debitRatio: 0.30 },
    discover: { percent: 7, debitRatio: 0.25 },
    amex: { percent: 22, debitRatio: 0 },
    other: { percent: 5, debitRatio: 0.40 }
  }
};

// PCBancard pricing options
export const pcbancardPricing = {
  interchangePlus: {
    markup: 0.20,           // 0.20% over interchange
    perTransaction: 0.10,   // $0.10 per transaction
    monthlyFee: 10,         // $10/month
    pciFee: 0,              // Included
    batchFee: 0,            // Included
    statementFee: 0         // Included
  },
  dualPricing: {
    serviceFee: 3.99,       // % charged to card users
    monthlyFee: 10,         // $10/month account fee
    portalFee: 10,          // $10/month portal access
    terminalWarranty: 24.95 // P1 warranty + portal (or $29.95 for P3)
  }
};

// Common junk fees to flag
export const junkFees = [
  { name: 'Annual Fee', typical: 0, max: 0 },
  { name: 'PCI Non-Compliance', typical: 0, max: 0 },
  { name: 'Regulatory Fee', typical: 0, max: 0 },
  { name: 'Account Maintenance', typical: 0, max: 10 },
  { name: 'IRS Reporting Fee', typical: 0, max: 0 },
  { name: 'Minimum Processing Fee', typical: 0, max: 25 },
  { name: 'Early Termination Fee', typical: 0, max: 0, warning: true },
  { name: 'Equipment Lease', typical: 0, max: 30, warning: true },
  { name: 'Statement Fee', typical: 0, max: 10 },
  { name: 'Batch Fee', typical: 0.10, max: 0.25, perItem: true },
  { name: 'Gateway Fee', typical: 0, max: 15 }
];
