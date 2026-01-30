export interface InterchangeRate {
  program: string;
  rate: number;
  perTransaction: number;
  cap?: number;
  notes?: string;
}

export interface CardBrandRates {
  brand: string;
  lastUpdated: string;
  cardPresent: {
    consumer: InterchangeRate[];
    debit: InterchangeRate[];
    commercial: InterchangeRate[];
  };
  cardNotPresent: {
    consumer: InterchangeRate[];
    debit: InterchangeRate[];
    commercial: InterchangeRate[];
  };
  restaurant: InterchangeRate[];
  supermarket: InterchangeRate[];
  regulated: InterchangeRate[];
}

export const VISA_RATES: CardBrandRates = {
  brand: "Visa",
  lastUpdated: "2025-10-18",
  cardPresent: {
    consumer: [
      { program: "CPS Retail Credit", rate: 1.65, perTransaction: 0.10 },
      { program: "CPS Rewards 1", rate: 1.65, perTransaction: 0.10 },
      { program: "CPS Rewards 2", rate: 1.95, perTransaction: 0.10 },
      { program: "Signature Preferred", rate: 2.10, perTransaction: 0.10 },
      { program: "Infinite", rate: 2.30, perTransaction: 0.10 },
    ],
    debit: [
      { program: "CPS Retail Debit", rate: 0.80, perTransaction: 0.15 },
      { program: "CPS Supermarket Debit", rate: 0.00, perTransaction: 0.30 },
      { program: "CPS Small Ticket Debit", rate: 1.55, perTransaction: 0.04 },
      { program: "CPS Restaurant Debit", rate: 1.19, perTransaction: 0.10 },
      { program: "CPS AFD Debit", rate: 0.80, perTransaction: 0.15, cap: 0.95 },
    ],
    commercial: [
      { program: "Commercial Card Present", rate: 2.50, perTransaction: 0.10 },
      { program: "Purchasing Card Level 2", rate: 2.50, perTransaction: 0.10 },
      { program: "Purchasing Card Level 3", rate: 2.30, perTransaction: 0.10 },
    ],
  },
  cardNotPresent: {
    consumer: [
      { program: "CPS E-Commerce Basic", rate: 1.80, perTransaction: 0.10 },
      { program: "CPS E-Commerce Preferred", rate: 1.95, perTransaction: 0.10 },
      { program: "Card Not Present", rate: 1.80, perTransaction: 0.10 },
      { program: "Standard (EIRF)", rate: 2.70, perTransaction: 0.10, notes: "Downgrade rate" },
    ],
    debit: [
      { program: "CPS Card Not Present Debit", rate: 1.65, perTransaction: 0.15 },
      { program: "CPS E-Commerce Basic Debit", rate: 1.65, perTransaction: 0.15 },
      { program: "CPS E-Commerce Preferred Debit", rate: 1.60, perTransaction: 0.15 },
      { program: "EIRF Debit", rate: 1.75, perTransaction: 0.20, notes: "Downgrade rate" },
      { program: "Standard Debit", rate: 1.90, perTransaction: 0.25, notes: "Worst case" },
    ],
    commercial: [
      { program: "Commercial Card Not Present", rate: 2.70, perTransaction: 0.10 },
    ],
  },
  restaurant: [
    { program: "CPS Restaurant", rate: 1.54, perTransaction: 0.10 },
    { program: "CPS Restaurant Debit", rate: 1.19, perTransaction: 0.10 },
  ],
  supermarket: [
    { program: "CPS Supermarket", rate: 1.22, perTransaction: 0.05 },
    { program: "CPS Supermarket Debit", rate: 0.00, perTransaction: 0.30 },
  ],
  regulated: [
    { program: "Regulated Debit", rate: 0.05, perTransaction: 0.21, notes: "Durbin Amendment - banks >$10B" },
    { program: "Regulated Debit + Fraud", rate: 0.05, perTransaction: 0.22, notes: "With fraud prevention" },
  ],
};

export const MASTERCARD_RATES: CardBrandRates = {
  brand: "Mastercard",
  lastUpdated: "2025-04-11",
  cardPresent: {
    consumer: [
      { program: "Merit I", rate: 1.95, perTransaction: 0.10 },
      { program: "Merit III Base", rate: 1.65, perTransaction: 0.10 },
      { program: "Merit III Tier 1", rate: 1.43, perTransaction: 0.10 },
      { program: "Merit III Tier 2", rate: 1.48, perTransaction: 0.10 },
      { program: "Merit III Tier 3", rate: 1.55, perTransaction: 0.10 },
      { program: "World", rate: 2.20, perTransaction: 0.10 },
      { program: "World Elite", rate: 2.30, perTransaction: 0.10 },
      { program: "World High Value", rate: 2.60, perTransaction: 0.10 },
    ],
    debit: [
      { program: "Merit III Base Debit", rate: 1.05, perTransaction: 0.15 },
      { program: "Merit III Tier 1 Debit", rate: 0.70, perTransaction: 0.15 },
      { program: "Merit III Tier 2 Debit", rate: 0.83, perTransaction: 0.15 },
      { program: "Merit III Tier 3 Debit", rate: 0.95, perTransaction: 0.15 },
    ],
    commercial: [
      { program: "Commercial Base", rate: 2.50, perTransaction: 0.10 },
      { program: "Commercial Data Rate I", rate: 2.65, perTransaction: 0.10 },
      { program: "Large Ticket", rate: 2.50, perTransaction: 0.10, cap: 100.00 },
    ],
  },
  cardNotPresent: {
    consumer: [
      { program: "Merit I CNP", rate: 1.95, perTransaction: 0.10 },
      { program: "Full UCAF", rate: 2.20, perTransaction: 0.10 },
      { program: "Key-entered", rate: 2.20, perTransaction: 0.10 },
      { program: "Merchant UCAF", rate: 2.20, perTransaction: 0.10 },
      { program: "World CNP", rate: 2.20, perTransaction: 0.10 },
      { program: "World Elite CNP", rate: 2.60, perTransaction: 0.10 },
      { program: "Standard", rate: 3.15, perTransaction: 0.10, notes: "Downgrade rate" },
    ],
    debit: [
      { program: "Full UCAF Debit", rate: 1.65, perTransaction: 0.15 },
      { program: "Key-Entered Debit", rate: 1.65, perTransaction: 0.15 },
      { program: "Standard Debit", rate: 1.90, perTransaction: 0.25, notes: "Worst case" },
    ],
    commercial: [
      { program: "Commercial CNP", rate: 2.70, perTransaction: 0.10 },
    ],
  },
  restaurant: [
    { program: "Restaurant", rate: 1.85, perTransaction: 0.10 },
    { program: "Quick Service Restaurant", rate: 1.47, perTransaction: 0.05 },
    { program: "Restaurant Debit", rate: 1.19, perTransaction: 0.10 },
  ],
  supermarket: [
    { program: "Supermarket Base", rate: 1.45, perTransaction: 0.10 },
    { program: "Supermarket Tier 1", rate: 1.15, perTransaction: 0.05 },
    { program: "Supermarket Tier 2", rate: 1.15, perTransaction: 0.05 },
    { program: "Supermarket Tier 3", rate: 1.22, perTransaction: 0.05 },
    { program: "Supermarket Debit", rate: 1.05, perTransaction: 0.15, cap: 0.35 },
  ],
  regulated: [
    { program: "Regulated Debit", rate: 0.05, perTransaction: 0.21, notes: "Durbin Amendment" },
    { program: "Regulated Debit + Fraud", rate: 0.05, perTransaction: 0.22 },
  ],
};

export const DISCOVER_RATES: CardBrandRates = {
  brand: "Discover",
  lastUpdated: "2025-04-11",
  cardPresent: {
    consumer: [
      { program: "Retail", rate: 1.56, perTransaction: 0.10 },
      { program: "Rewards", rate: 1.71, perTransaction: 0.10 },
      { program: "Premium Plus", rate: 1.87, perTransaction: 0.10 },
      { program: "Premium Plus Rewards", rate: 2.15, perTransaction: 0.10 },
    ],
    debit: [
      { program: "PIN Debit", rate: 0.80, perTransaction: 0.15 },
      { program: "Signature Debit", rate: 0.80, perTransaction: 0.15 },
    ],
    commercial: [],
  },
  cardNotPresent: {
    consumer: [
      { program: "E-Commerce", rate: 1.81, perTransaction: 0.10 },
      { program: "MOTO", rate: 1.87, perTransaction: 0.10 },
      { program: "Standard", rate: 2.40, perTransaction: 0.10 },
    ],
    debit: [
      { program: "CNP Debit", rate: 1.65, perTransaction: 0.15 },
    ],
    commercial: [],
  },
  restaurant: [
    { program: "Restaurant", rate: 1.40, perTransaction: 0.10 },
    { program: "Quick Service", rate: 1.40, perTransaction: 0.05 },
  ],
  supermarket: [
    { program: "Supermarket", rate: 1.15, perTransaction: 0.05 },
    { program: "Supermarket/Warehouse Clubs", rate: 1.40, perTransaction: 0.05 },
  ],
  regulated: [
    { program: "Regulated Debit", rate: 0.05, perTransaction: 0.21 },
    { program: "Regulated Debit + Fraud", rate: 0.05, perTransaction: 0.22 },
  ],
};

export const AMEX_OPTBLUE_RATES: CardBrandRates = {
  brand: "American Express OptBlue",
  lastUpdated: "2025-04-11",
  cardPresent: {
    consumer: [
      { program: "Retail Tier 1", rate: 1.60, perTransaction: 0.10 },
      { program: "Retail Tier 2", rate: 1.90, perTransaction: 0.10 },
      { program: "Retail Tier 3", rate: 2.40, perTransaction: 0.10 },
    ],
    debit: [
      { program: "Consumer Unregulated Base Debit", rate: 0.99, perTransaction: 0.15 },
      { program: "Small Business Unregulated Base Debit", rate: 1.94, perTransaction: 0.10 },
      { program: "Consumer Regulated Base Debit", rate: 0.04, perTransaction: 0.25 },
    ],
    commercial: [
      { program: "B2B Wholesale Tier 1", rate: 1.65, perTransaction: 0.10 },
      { program: "B2B Wholesale Tier 2", rate: 1.90, perTransaction: 0.10 },
      { program: "B2B Wholesale Tier 3", rate: 2.35, perTransaction: 0.10 },
    ],
  },
  cardNotPresent: {
    consumer: [
      { program: "CNP Tier 1", rate: 1.85, perTransaction: 0.10 },
      { program: "CNP Tier 2", rate: 2.20, perTransaction: 0.10 },
      { program: "CNP Tier 3", rate: 2.70, perTransaction: 0.10 },
    ],
    debit: [
      { program: "Consumer Unregulated CNP Debit", rate: 1.29, perTransaction: 0.15 },
      { program: "Small Business Unregulated CNP Debit", rate: 2.24, perTransaction: 0.10 },
    ],
    commercial: [
      { program: "B2B Wholesale CNP Tier 1", rate: 1.95, perTransaction: 0.10 },
      { program: "B2B Wholesale CNP Tier 2", rate: 2.20, perTransaction: 0.10 },
      { program: "B2B Wholesale CNP Tier 3", rate: 2.65, perTransaction: 0.10 },
    ],
  },
  restaurant: [
    { program: "Restaurant Tier 1", rate: 1.55, perTransaction: 0.10 },
    { program: "Restaurant Tier 2", rate: 1.80, perTransaction: 0.10 },
    { program: "Restaurant Tier 3", rate: 2.30, perTransaction: 0.10 },
  ],
  supermarket: [
    { program: "Supermarket Tier 1", rate: 1.30, perTransaction: 0.10 },
    { program: "Supermarket Tier 2", rate: 1.60, perTransaction: 0.10 },
    { program: "Supermarket Tier 3", rate: 2.00, perTransaction: 0.10 },
  ],
  regulated: [
    { program: "Consumer Regulated Base Debit", rate: 0.04, perTransaction: 0.25 },
    { program: "Small Business Regulated Base Debit", rate: 0.04, perTransaction: 0.25 },
  ],
};

export interface AssessmentFee {
  brand: string;
  rate: number;
  perTransaction?: number;
  notes?: string;
}

export const ASSESSMENT_FEES: AssessmentFee[] = [
  { brand: "Visa", rate: 0.13, perTransaction: 0.0195, notes: "FANF per location" },
  { brand: "Mastercard", rate: 0.13, perTransaction: 0.0195, notes: "Some transactions" },
  { brand: "Discover", rate: 0.13 },
  { brand: "American Express", rate: 0.15, notes: "OptBlue program" },
];

export interface CardMix {
  visa: number;
  mastercard: number;
  discover: number;
  amex: number;
  debit: number;
  debitRegulated: number;
}

export const DEFAULT_CARD_MIX: CardMix = {
  visa: 0.35,
  mastercard: 0.25,
  discover: 0.08,
  amex: 0.12,
  debit: 0.15,
  debitRegulated: 0.05,
};

export type MerchantCategory = 
  | "retail"
  | "restaurant"
  | "qsr"
  | "supermarket"
  | "ecommerce"
  | "service"
  | "lodging"
  | "healthcare"
  | "b2b"
  | "government"
  | "education";

export const AVERAGE_RATES_BY_CATEGORY: Record<MerchantCategory, { cardPresent: number; cardNotPresent: number }> = {
  retail: { cardPresent: 1.75, cardNotPresent: 2.10 },
  restaurant: { cardPresent: 1.55, cardNotPresent: 2.00 },
  qsr: { cardPresent: 1.45, cardNotPresent: 1.90 },
  supermarket: { cardPresent: 1.25, cardNotPresent: 1.80 },
  ecommerce: { cardPresent: 1.80, cardNotPresent: 2.20 },
  service: { cardPresent: 1.70, cardNotPresent: 2.05 },
  lodging: { cardPresent: 1.65, cardNotPresent: 2.00 },
  healthcare: { cardPresent: 1.80, cardNotPresent: 2.15 },
  b2b: { cardPresent: 2.50, cardNotPresent: 2.70 },
  government: { cardPresent: 1.55, cardNotPresent: 1.85 },
  education: { cardPresent: 1.45, cardNotPresent: 1.75 },
};

export const DOWNGRADE_REASONS = [
  "Not settled within 24-48 hours (batch not closed)",
  "AVS (Address Verification) not used for CNP transactions",
  "Missing data (invoice number, customer code)",
  "Keyed instead of swiped (card present but manually entered)",
  "No CVV for card-not-present transactions",
  "Authorization mismatch (amount differs from settled amount)",
  "Missing merchant category code",
];

export const DOWNGRADE_COST_INCREASE = {
  min: 0.50,
  max: 1.50,
  typical: 0.75,
};

export const DUAL_PRICING_INFO = {
  typicalServiceFee: { min: 3.00, max: 3.99 },
  complianceRequirements: [
    "Clear disclosure of pricing (cash vs card)",
    "Posted signage required",
    "Receipt must show both prices",
    "Cannot exceed card brand surcharge limit (4% max)",
  ],
  effectiveCostToMerchant: 0,
  notes: "With dual pricing, the service fee is passed to the cardholder, reducing merchant's effective interchange cost to approximately 0%",
};

export function getAllRates(): CardBrandRates[] {
  return [VISA_RATES, MASTERCARD_RATES, DISCOVER_RATES, AMEX_OPTBLUE_RATES];
}
