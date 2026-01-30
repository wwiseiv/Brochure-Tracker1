// Interchange rates database - Updated 2024-2025
// These are wholesale costs set by Visa, Mastercard, Discover, and Amex

export const interchangeRates = {
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
    }
  },
  mastercard: {
    retail: {
      debitRegulated: { percent: 0.05, fixed: 0.21, name: 'Regulated Debit' },
      debitUnregulated: { percent: 0.80, fixed: 0.15, name: 'Unregulated Debit' },
      meritI: { percent: 1.58, fixed: 0.10, name: 'Merit I' },
      world: { percent: 1.73, fixed: 0.10, name: 'World' },
      worldElite: { percent: 2.05, fixed: 0.10, name: 'World Elite' },
      commercial: { percent: 2.50, fixed: 0.10, name: 'Commercial' }
    },
    restaurant: {
      restaurant: { percent: 1.47, fixed: 0.10, name: 'Restaurant' }
    }
  },
  discover: {
    retail: {
      retail: { percent: 1.56, fixed: 0.10, name: 'Retail' },
      rewards: { percent: 1.71, fixed: 0.10, name: 'Rewards' },
      premiumPlus: { percent: 2.15, fixed: 0.10, name: 'Premium Plus' }
    },
    restaurant: {
      restaurant: { percent: 1.40, fixed: 0.10, name: 'Restaurant' }
    }
  },
  amex: {
    optblue: { percent: 2.00, fixed: 0.10, name: 'OptBlue Retail' },
    restaurant: { percent: 1.90, fixed: 0.10, name: 'OptBlue Restaurant' },
    ecommerce: { percent: 2.40, fixed: 0.10, name: 'OptBlue E-Commerce' }
  }
};

export const assessmentFees = {
  visa: 0.13,
  mastercard: 0.13,
  discover: 0.13,
  amex: 0.15
};

export const typicalCardMix = {
  retail: { visa: 40, mastercard: 28, discover: 8, amex: 18, debitRatio: 0.35 },
  restaurant: { visa: 42, mastercard: 30, discover: 6, amex: 18, debitRatio: 0.25 },
  ecommerce: { visa: 45, mastercard: 30, discover: 8, amex: 15, debitRatio: 0.20 },
  service: { visa: 38, mastercard: 28, discover: 7, amex: 22, debitRatio: 0.30 }
};

export const pcbancardPricing = {
  interchangePlus: {
    markup: 0.20,
    perTransaction: 0.10,
    monthlyFee: 10
  },
  dualPricing: {
    serviceFee: 3.99,
    monthlyFee: 44.95
  }
};

// Known processor patterns for identification
export const processorPatterns = {
  'First Data': ['first data', 'fiserv', 'clover', 'fdms'],
  'TSYS': ['tsys', 'global payments', 'heartland', 'cayan'],
  'Worldpay': ['worldpay', 'vantiv', 'fis'],
  'Square': ['square', 'sq '],
  'Stripe': ['stripe'],
  'PayPal': ['paypal', 'braintree'],
  'Elavon': ['elavon', 'us bank'],
  'Chase': ['chase paymentech', 'jpmorgan'],
  'Bank of America': ['bank of america', 'bofa merchant'],
  'Wells Fargo': ['wells fargo'],
  'Toast': ['toast'],
  'Clover': ['clover network']
};
