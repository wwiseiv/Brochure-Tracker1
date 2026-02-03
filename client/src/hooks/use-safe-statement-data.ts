/**
 * Safe Statement Data Hook
 * ========================
 * 
 * Provides type-safe access to statement analysis data with guaranteed defaults.
 * Eliminates undefined crashes by ensuring all fields always have valid values.
 */

import { useMemo } from 'react';

export interface CardBreakdown {
  visa: number;
  mastercard: number;
  discover: number;
  amex: number;
  other: number;
}

export interface Fee {
  type: string;
  amount: number;
  category?: string;
  isRedFlag?: boolean;
}

export interface SafeStatementData {
  merchantInfo: {
    name: string;
    processor: string;
    statementDate: string;
    mid: string;
  };
  volumeData: {
    totalVolume: number;
    totalTransactions: number;
    avgTicket: number;
    cardBreakdown: CardBreakdown;
  };
  fees: Fee[];
  effectiveRate: number;
}

export interface SafeSavings {
  interchangePlus: {
    monthlyCost: number;
    monthlySavings: number;
    annualSavings: number;
    effectiveRate: number;
  };
  dualPricing: {
    monthlyCost: number;
    monthlySavings: number;
    annualSavings: number;
    effectiveRate: number;
  };
}

export interface ConfidenceScore {
  overall: number;
  merchantInfo: number;
  volumeData: number;
  fees: number;
}

export interface ValidationIssue {
  field: string;
  issue: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface AnalysisResult {
  extractedData?: any;
  savings?: any;
  confidence?: number | ConfidenceScore;
  needsManualReview?: boolean;
  reviewReasons?: string[];
  validationIssues?: ValidationIssue[];
  redFlags?: any[];
}

const DEFAULT_STATEMENT_DATA: SafeStatementData = {
  merchantInfo: {
    name: '',
    processor: '',
    statementDate: new Date().toISOString().split('T')[0],
    mid: '',
  },
  volumeData: {
    totalVolume: 0,
    totalTransactions: 0,
    avgTicket: 0,
    cardBreakdown: {
      visa: 0,
      mastercard: 0,
      discover: 0,
      amex: 0,
      other: 0,
    },
  },
  fees: [],
  effectiveRate: 0,
};

const DEFAULT_SAVINGS: SafeSavings = {
  interchangePlus: {
    monthlyCost: 0,
    monthlySavings: 0,
    annualSavings: 0,
    effectiveRate: 0,
  },
  dualPricing: {
    monthlyCost: 0,
    monthlySavings: 0,
    annualSavings: 0,
    effectiveRate: 0,
  },
};

const DEFAULT_CONFIDENCE: ConfidenceScore = {
  overall: 0,
  merchantInfo: 0,
  volumeData: 0,
  fees: 0,
};

function safeNumber(value: any, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = typeof value === 'string' ? parseFloat(value.replace(/[$,]/g, '')) : Number(value);
  return isNaN(num) ? fallback : num;
}

function safeString(value: any, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function safeArray<T>(value: any, fallback: T[] = []): T[] {
  if (!Array.isArray(value)) return fallback;
  return value;
}

function sanitizeMerchantInfo(raw: any): SafeStatementData['merchantInfo'] {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_STATEMENT_DATA.merchantInfo };
  }
  
  return {
    name: safeString(raw.name, DEFAULT_STATEMENT_DATA.merchantInfo.name),
    processor: safeString(raw.processor, DEFAULT_STATEMENT_DATA.merchantInfo.processor),
    statementDate: safeString(raw.statementDate, DEFAULT_STATEMENT_DATA.merchantInfo.statementDate),
    mid: safeString(raw.mid, DEFAULT_STATEMENT_DATA.merchantInfo.mid),
  };
}

function sanitizeCardBreakdown(raw: any): CardBreakdown {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_STATEMENT_DATA.volumeData.cardBreakdown };
  }
  
  return {
    visa: safeNumber(raw.visa, 0),
    mastercard: safeNumber(raw.mastercard, 0),
    discover: safeNumber(raw.discover, 0),
    amex: safeNumber(raw.amex, 0),
    other: safeNumber(raw.other, 0),
  };
}

function sanitizeVolumeData(raw: any): SafeStatementData['volumeData'] {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_STATEMENT_DATA.volumeData };
  }
  
  const totalVolume = safeNumber(raw.totalVolume, 0);
  const totalTransactions = safeNumber(raw.totalTransactions, 0);
  
  let avgTicket = safeNumber(raw.avgTicket, 0);
  if (avgTicket === 0 && totalVolume > 0 && totalTransactions > 0) {
    avgTicket = Math.round((totalVolume / totalTransactions) * 100) / 100;
  }
  
  return {
    totalVolume,
    totalTransactions,
    avgTicket,
    cardBreakdown: sanitizeCardBreakdown(raw.cardBreakdown),
  };
}

function sanitizeFees(raw: any): Fee[] {
  if (!Array.isArray(raw)) return [];
  
  return raw
    .filter((fee: any) => fee && typeof fee === 'object')
    .map((fee: any) => ({
      type: safeString(fee.type, 'Unknown Fee'),
      amount: safeNumber(fee.amount, 0),
      category: safeString(fee.category, 'other'),
      isRedFlag: Boolean(fee.isRedFlag),
    }))
    .filter((fee: Fee) => fee.amount >= 0);
}

function sanitizeSavingsScenario(raw: any): SafeSavings['interchangePlus'] {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SAVINGS.interchangePlus };
  }
  
  return {
    monthlyCost: safeNumber(raw.monthlyCost, 0),
    monthlySavings: safeNumber(raw.monthlySavings, 0),
    annualSavings: safeNumber(raw.annualSavings, 0),
    effectiveRate: safeNumber(raw.effectiveRate, 0),
  };
}

function sanitizeSavings(raw: any): SafeSavings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SAVINGS };
  }
  
  return {
    interchangePlus: sanitizeSavingsScenario(raw.interchangePlus),
    dualPricing: sanitizeSavingsScenario(raw.dualPricing),
  };
}

function sanitizeConfidence(raw: any): ConfidenceScore {
  if (typeof raw === 'number') {
    return {
      overall: safeNumber(raw, 0),
      merchantInfo: 50,
      volumeData: 50,
      fees: 50,
    };
  }
  
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_CONFIDENCE };
  }
  
  return {
    overall: safeNumber(raw.overall, 0),
    merchantInfo: safeNumber(raw.merchantInfo, 50),
    volumeData: safeNumber(raw.volumeData, 50),
    fees: safeNumber(raw.fees, 50),
  };
}

function sanitizeStatementData(raw: any): SafeStatementData {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_STATEMENT_DATA };
  }
  
  return {
    merchantInfo: sanitizeMerchantInfo(raw.merchantInfo),
    volumeData: sanitizeVolumeData(raw.volumeData),
    fees: sanitizeFees(raw.fees),
    effectiveRate: safeNumber(raw.effectiveRate, 0),
  };
}

export interface UseSafeStatementDataResult {
  safeData: SafeStatementData;
  safeSavings: SafeSavings;
  confidence: ConfidenceScore;
  needsManualReview: boolean;
  reviewReasons: string[];
  validationIssues: ValidationIssue[];
  redFlags: any[];
  hasData: boolean;
  hasSavings: boolean;
  isLowConfidence: boolean;
  formatted: {
    totalVolume: string;
    totalTransactions: string;
    avgTicket: string;
    effectiveRate: string;
    monthlySavingsIC: string;
    annualSavingsIC: string;
    monthlySavingsDP: string;
    annualSavingsDP: string;
  };
}

export function useSafeStatementData(analysis: AnalysisResult | null | undefined): UseSafeStatementDataResult {
  return useMemo(() => {
    const safeData = sanitizeStatementData(analysis?.extractedData);
    const safeSavings = sanitizeSavings(analysis?.savings);
    const confidence = sanitizeConfidence(analysis?.confidence);
    
    const needsManualReview = Boolean(analysis?.needsManualReview);
    const reviewReasons = safeArray(analysis?.reviewReasons, []);
    const validationIssues = safeArray<ValidationIssue>(analysis?.validationIssues, []);
    const redFlags = safeArray(analysis?.redFlags, []);
    
    const hasData = safeData.volumeData.totalVolume > 0;
    const hasSavings = safeSavings.interchangePlus.annualSavings > 0 || safeSavings.dualPricing.annualSavings > 0;
    const isLowConfidence = confidence.overall < 70;
    
    const formatted = {
      totalVolume: `$${safeData.volumeData.totalVolume.toLocaleString()}`,
      totalTransactions: safeData.volumeData.totalTransactions.toLocaleString(),
      avgTicket: `$${safeData.volumeData.avgTicket.toFixed(2)}`,
      effectiveRate: `${safeData.effectiveRate.toFixed(2)}%`,
      monthlySavingsIC: `$${safeSavings.interchangePlus.monthlySavings.toLocaleString()}`,
      annualSavingsIC: `$${safeSavings.interchangePlus.annualSavings.toLocaleString()}`,
      monthlySavingsDP: `$${safeSavings.dualPricing.monthlySavings.toLocaleString()}`,
      annualSavingsDP: `$${safeSavings.dualPricing.annualSavings.toLocaleString()}`,
    };
    
    return {
      safeData,
      safeSavings,
      confidence,
      needsManualReview,
      reviewReasons,
      validationIssues,
      redFlags,
      hasData,
      hasSavings,
      isLowConfidence,
      formatted,
    };
  }, [analysis]);
}

export {
  sanitizeStatementData,
  sanitizeSavings,
  sanitizeConfidence,
  safeNumber,
  safeString,
  safeArray,
  DEFAULT_STATEMENT_DATA,
  DEFAULT_SAVINGS,
  DEFAULT_CONFIDENCE,
};

export default useSafeStatementData;
