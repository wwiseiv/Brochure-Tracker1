/**
 * Statement Analyzer Hardening Module
 * ====================================
 * 
 * This module provides robust validation, sanitization, and confidence scoring
 * for the Statement Analyzer to prevent UI crashes from bad/incomplete AI extraction.
 */

export interface CardBreakdown {
  visa: number;
  mastercard: number;
  discover: number;
  amex: number;
  other?: number;
}

export interface Fee {
  type: string;
  amount: number;
  category?: string;
  isRedFlag?: boolean;
}

export interface ExtractedStatementData {
  merchantInfo?: {
    name?: string;
    processor?: string;
    statementDate?: string;
    mid?: string;
  };
  volumeData?: {
    totalVolume?: number;
    totalTransactions?: number;
    avgTicket?: number;
    cardBreakdown?: Partial<CardBreakdown>;
  };
  fees?: Fee[];
  effectiveRate?: number;
  rawText?: string;
}

export interface ValidationIssue {
  field: string;
  issue: 'missing' | 'invalid' | 'suspicious' | 'out_of_range';
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestedValue?: any;
}

export interface ConfidenceScore {
  overall: number;
  merchantInfo: number;
  volumeData: number;
  fees: number;
  breakdown: {
    field: string;
    confidence: number;
    reason: string;
  }[];
}

export interface SanitizedStatementData {
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

export interface ValidationResult {
  data: SanitizedStatementData;
  confidence: ConfidenceScore;
  issues: ValidationIssue[];
  needsManualReview: boolean;
  reviewReasons: string[];
  originalData: ExtractedStatementData;
}

const DEFAULTS: SanitizedStatementData = {
  merchantInfo: {
    name: 'Unknown Merchant',
    processor: 'Unknown Processor',
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

const VALIDATION_RULES = {
  volume: {
    min: 0,
    max: 100000000,
    suspiciouslyLow: 100,
    suspiciouslyHigh: 10000000,
  },
  transactions: {
    min: 0,
    max: 1000000,
    suspiciouslyLow: 1,
  },
  avgTicket: {
    min: 0.01,
    max: 50000,
    suspiciouslyLow: 1,
    suspiciouslyHigh: 10000,
  },
  effectiveRate: {
    min: 0,
    max: 15,
    typical: { min: 1.5, max: 4.5 },
    redFlagThreshold: 5,
  },
  cardBreakdownTolerance: 0.05,
  minConfidenceForAutoApprove: 70,
  criticalFields: ['totalVolume', 'totalTransactions', 'effectiveRate'],
};

export class StatementValidator {
  private issues: ValidationIssue[] = [];
  private confidenceBreakdown: ConfidenceScore['breakdown'] = [];
  
  constructor() {
    this.reset();
  }
  
  reset() {
    this.issues = [];
    this.confidenceBreakdown = [];
  }
  
  validateAndSanitize(raw: ExtractedStatementData | null | undefined): ValidationResult {
    this.reset();
    
    if (!raw) {
      this.addIssue('root', 'missing', 'No data extracted from statement', 'error');
      return this.buildResult(DEFAULTS, raw || {});
    }
    
    const merchantInfo = this.sanitizeMerchantInfo(raw.merchantInfo);
    const volumeData = this.sanitizeVolumeData(raw.volumeData);
    const fees = this.sanitizeFees(raw.fees);
    const effectiveRate = this.sanitizeEffectiveRate(raw.effectiveRate, volumeData, fees);
    
    this.crossValidate(volumeData, fees, effectiveRate);
    
    const sanitized: SanitizedStatementData = {
      merchantInfo,
      volumeData,
      fees,
      effectiveRate,
    };
    
    return this.buildResult(sanitized, raw);
  }
  
  private sanitizeMerchantInfo(raw?: ExtractedStatementData['merchantInfo']): SanitizedStatementData['merchantInfo'] {
    const result = { ...DEFAULTS.merchantInfo };
    
    if (!raw) {
      this.addIssue('merchantInfo', 'missing', 'Merchant information not extracted', 'warning');
      this.addConfidence('merchantInfo', 0, 'Section missing');
      return result;
    }
    
    let sectionConfidence = 100;
    
    if (raw.name && typeof raw.name === 'string' && raw.name.trim()) {
      result.name = this.sanitizeString(raw.name, 100);
    } else {
      this.addIssue('merchantInfo.name', 'missing', 'Merchant name not found', 'warning');
      sectionConfidence -= 25;
    }
    
    if (raw.processor && typeof raw.processor === 'string' && raw.processor.trim()) {
      result.processor = this.sanitizeString(raw.processor, 100);
    } else {
      this.addIssue('merchantInfo.processor', 'missing', 'Processor name not found', 'info');
      sectionConfidence -= 15;
    }
    
    if (raw.statementDate) {
      const parsedDate = this.parseDate(raw.statementDate);
      if (parsedDate) {
        result.statementDate = parsedDate;
      } else {
        this.addIssue('merchantInfo.statementDate', 'invalid', `Could not parse date: ${raw.statementDate}`, 'warning');
        sectionConfidence -= 10;
      }
    } else {
      this.addIssue('merchantInfo.statementDate', 'missing', 'Statement date not found', 'info');
      sectionConfidence -= 10;
    }
    
    if (raw.mid && typeof raw.mid === 'string') {
      result.mid = this.sanitizeString(raw.mid, 50);
    }
    
    this.addConfidence('merchantInfo', Math.max(0, sectionConfidence), 'Validated');
    return result;
  }
  
  private sanitizeVolumeData(raw?: ExtractedStatementData['volumeData']): SanitizedStatementData['volumeData'] {
    const result = { ...DEFAULTS.volumeData, cardBreakdown: { ...DEFAULTS.volumeData.cardBreakdown } };
    
    if (!raw) {
      this.addIssue('volumeData', 'missing', 'Volume data not extracted - this is critical', 'error');
      this.addConfidence('volumeData', 0, 'Section missing');
      return result;
    }
    
    let sectionConfidence = 100;
    
    if (raw.totalVolume !== undefined && raw.totalVolume !== null) {
      const volume = this.sanitizeNumber(raw.totalVolume);
      if (volume !== null) {
        if (volume < VALIDATION_RULES.volume.min || volume > VALIDATION_RULES.volume.max) {
          this.addIssue('volumeData.totalVolume', 'out_of_range', 
            `Volume $${volume.toLocaleString()} is outside expected range`, 'error');
          sectionConfidence -= 40;
        } else if (volume < VALIDATION_RULES.volume.suspiciouslyLow) {
          this.addIssue('volumeData.totalVolume', 'suspicious', 
            `Volume $${volume.toLocaleString()} seems unusually low`, 'warning');
          sectionConfidence -= 15;
        } else if (volume > VALIDATION_RULES.volume.suspiciouslyHigh) {
          this.addIssue('volumeData.totalVolume', 'suspicious', 
            `Volume $${volume.toLocaleString()} is very high - please verify`, 'warning');
          sectionConfidence -= 10;
        }
        result.totalVolume = Math.max(0, volume);
      } else {
        this.addIssue('volumeData.totalVolume', 'invalid', 'Could not parse total volume', 'error');
        sectionConfidence -= 40;
      }
    } else {
      this.addIssue('volumeData.totalVolume', 'missing', 'Total volume not found - this is critical', 'error');
      sectionConfidence -= 40;
    }
    
    if (raw.totalTransactions !== undefined && raw.totalTransactions !== null) {
      const txns = this.sanitizeNumber(raw.totalTransactions);
      if (txns !== null) {
        result.totalTransactions = Math.max(0, Math.round(txns));
        if (txns < VALIDATION_RULES.transactions.suspiciouslyLow) {
          this.addIssue('volumeData.totalTransactions', 'suspicious', 
            `Only ${txns} transactions seems unusually low`, 'warning');
          sectionConfidence -= 10;
        }
      } else {
        this.addIssue('volumeData.totalTransactions', 'invalid', 'Could not parse transaction count', 'warning');
        sectionConfidence -= 20;
      }
    } else {
      this.addIssue('volumeData.totalTransactions', 'missing', 'Transaction count not found', 'warning');
      sectionConfidence -= 20;
    }
    
    if (raw.avgTicket !== undefined && raw.avgTicket !== null) {
      const avgTicket = this.sanitizeNumber(raw.avgTicket);
      if (avgTicket !== null) {
        result.avgTicket = Math.max(0, avgTicket);
      }
    } else if (result.totalVolume > 0 && result.totalTransactions > 0) {
      result.avgTicket = Math.round((result.totalVolume / result.totalTransactions) * 100) / 100;
      this.addIssue('volumeData.avgTicket', 'missing', 
        `Average ticket calculated as $${result.avgTicket.toFixed(2)}`, 'info');
    }
    
    if (result.avgTicket > 0) {
      if (result.avgTicket < VALIDATION_RULES.avgTicket.suspiciouslyLow) {
        this.addIssue('volumeData.avgTicket', 'suspicious', 
          `Average ticket $${result.avgTicket.toFixed(2)} seems very low`, 'warning');
      } else if (result.avgTicket > VALIDATION_RULES.avgTicket.suspiciouslyHigh) {
        this.addIssue('volumeData.avgTicket', 'suspicious', 
          `Average ticket $${result.avgTicket.toFixed(2)} is unusually high`, 'warning');
      }
    }
    
    if (raw.cardBreakdown) {
      const breakdown = this.sanitizeCardBreakdown(raw.cardBreakdown, result.totalVolume);
      result.cardBreakdown = breakdown;
    } else {
      this.addIssue('volumeData.cardBreakdown', 'missing', 'Card brand breakdown not found', 'info');
      sectionConfidence -= 10;
    }
    
    this.addConfidence('volumeData', Math.max(0, sectionConfidence), 'Validated');
    return result;
  }
  
  private sanitizeCardBreakdown(raw: Partial<CardBreakdown>, totalVolume: number): CardBreakdown {
    const result: CardBreakdown = {
      visa: this.sanitizeNumber(raw.visa) ?? 0,
      mastercard: this.sanitizeNumber(raw.mastercard) ?? 0,
      discover: this.sanitizeNumber(raw.discover) ?? 0,
      amex: this.sanitizeNumber(raw.amex) ?? 0,
      other: this.sanitizeNumber(raw.other) ?? 0,
    };
    
    const sum = result.visa + result.mastercard + result.discover + result.amex + (result.other || 0);
    
    if (totalVolume > 0 && sum > 0) {
      const ratio = sum / totalVolume;
      if (Math.abs(ratio - 1) > VALIDATION_RULES.cardBreakdownTolerance) {
        this.addIssue('volumeData.cardBreakdown', 'suspicious', 
          `Card breakdown ($${sum.toLocaleString()}) doesn't match total volume ($${totalVolume.toLocaleString()})`, 
          'warning');
      }
    }
    
    return result;
  }
  
  private sanitizeFees(raw?: Fee[]): Fee[] {
    if (!raw || !Array.isArray(raw)) {
      this.addIssue('fees', 'missing', 'Fee breakdown not extracted', 'warning');
      this.addConfidence('fees', 30, 'Section missing');
      return [];
    }
    
    let sectionConfidence = 100;
    const sanitized: Fee[] = [];
    
    for (const fee of raw) {
      if (!fee || typeof fee !== 'object') continue;
      
      const type = fee.type && typeof fee.type === 'string' ? fee.type.trim() : 'Unknown Fee';
      const amount = this.sanitizeNumber(fee.amount);
      
      if (amount === null || amount < 0) {
        this.addIssue(`fees.${type}`, 'invalid', `Invalid fee amount for ${type}`, 'warning');
        sectionConfidence -= 5;
        continue;
      }
      
      sanitized.push({
        type,
        amount,
        category: fee.category || this.categorizeFee(type),
        isRedFlag: fee.isRedFlag || false,
      });
    }
    
    if (sanitized.length === 0 && raw.length > 0) {
      this.addIssue('fees', 'invalid', 'All fees failed validation', 'error');
      sectionConfidence = 20;
    }
    
    this.addConfidence('fees', Math.max(0, sectionConfidence), `${sanitized.length} fees validated`);
    return sanitized;
  }
  
  private sanitizeEffectiveRate(
    raw: number | undefined, 
    volumeData: SanitizedStatementData['volumeData'],
    fees: Fee[]
  ): number {
    if (raw !== undefined && raw !== null) {
      const rate = this.sanitizeNumber(raw);
      if (rate !== null && rate >= 0 && rate <= VALIDATION_RULES.effectiveRate.max) {
        if (rate > VALIDATION_RULES.effectiveRate.redFlagThreshold) {
          this.addIssue('effectiveRate', 'suspicious', 
            `Effective rate of ${rate.toFixed(2)}% is above typical range`, 'warning');
        }
        return rate;
      }
    }
    
    if (volumeData.totalVolume > 0 && fees.length > 0) {
      const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
      const calculatedRate = (totalFees / volumeData.totalVolume) * 100;
      
      if (calculatedRate >= 0 && calculatedRate <= VALIDATION_RULES.effectiveRate.max) {
        this.addIssue('effectiveRate', 'missing', 
          `Effective rate calculated as ${calculatedRate.toFixed(2)}%`, 'info');
        return Math.round(calculatedRate * 100) / 100;
      }
    }
    
    this.addIssue('effectiveRate', 'missing', 'Could not determine effective rate', 'warning');
    return 0;
  }
  
  private crossValidate(
    volumeData: SanitizedStatementData['volumeData'],
    fees: Fee[],
    effectiveRate: number
  ): void {
    if (volumeData.totalVolume > 0 && volumeData.totalTransactions > 0) {
      const impliedAvgTicket = volumeData.totalVolume / volumeData.totalTransactions;
      
      if (impliedAvgTicket < 0.01) {
        this.addIssue('crossValidation', 'suspicious', 
          'Transaction count seems too high relative to volume', 'warning');
      }
      
      if (impliedAvgTicket > 50000) {
        this.addIssue('crossValidation', 'suspicious', 
          'Transaction count seems too low relative to volume', 'warning');
      }
    }
    
    if (volumeData.totalVolume > 0 && fees.length > 0 && effectiveRate > 0) {
      const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
      const impliedRate = (totalFees / volumeData.totalVolume) * 100;
      
      if (Math.abs(impliedRate - effectiveRate) > 1) {
        this.addIssue('crossValidation', 'suspicious', 
          `Fee total implies ${impliedRate.toFixed(2)}% rate but ${effectiveRate.toFixed(2)}% was extracted`, 
          'warning');
      }
    }
  }
  
  private buildResult(data: SanitizedStatementData, original: ExtractedStatementData): ValidationResult {
    const confidence = this.calculateOverallConfidence();
    const { needsManualReview, reviewReasons } = this.determineManualReview(confidence);
    
    return {
      data,
      confidence,
      issues: [...this.issues],
      needsManualReview,
      reviewReasons,
      originalData: original,
    };
  }
  
  private calculateOverallConfidence(): ConfidenceScore {
    const sectionScores: Record<string, number> = {
      merchantInfo: 50,
      volumeData: 50,
      fees: 50,
    };
    
    for (const item of this.confidenceBreakdown) {
      if (item.field in sectionScores) {
        sectionScores[item.field] = item.confidence;
      }
    }
    
    const weights = {
      merchantInfo: 0.2,
      volumeData: 0.5,
      fees: 0.3,
    };
    
    const overall = Math.round(
      sectionScores.merchantInfo * weights.merchantInfo +
      sectionScores.volumeData * weights.volumeData +
      sectionScores.fees * weights.fees
    );
    
    return {
      overall,
      merchantInfo: sectionScores.merchantInfo,
      volumeData: sectionScores.volumeData,
      fees: sectionScores.fees,
      breakdown: [...this.confidenceBreakdown],
    };
  }
  
  private determineManualReview(confidence: ConfidenceScore): { needsManualReview: boolean; reviewReasons: string[] } {
    const reasons: string[] = [];
    
    if (confidence.overall < VALIDATION_RULES.minConfidenceForAutoApprove) {
      reasons.push(`Low confidence score (${confidence.overall}%)`);
    }
    
    const criticalErrors = this.issues.filter(i => 
      i.severity === 'error' && VALIDATION_RULES.criticalFields.some(f => i.field.includes(f))
    );
    if (criticalErrors.length > 0) {
      reasons.push(`Missing critical data: ${criticalErrors.map(e => e.field).join(', ')}`);
    }
    
    const warnings = this.issues.filter(i => i.severity === 'warning');
    if (warnings.length >= 5) {
      reasons.push(`Multiple data quality warnings (${warnings.length})`);
    }
    
    if (confidence.volumeData < 50) {
      reasons.push('Volume data extraction uncertain');
    }
    
    return {
      needsManualReview: reasons.length > 0,
      reviewReasons: reasons,
    };
  }
  
  private addIssue(field: string, issue: ValidationIssue['issue'], message: string, severity: ValidationIssue['severity']) {
    this.issues.push({ field, issue, message, severity });
  }
  
  private addConfidence(field: string, confidence: number, reason: string) {
    this.confidenceBreakdown.push({ field, confidence, reason });
  }
  
  private sanitizeString(value: any, maxLength: number = 255): string {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
  }
  
  private sanitizeNumber(value: any): number | null {
    if (value === null || value === undefined) return null;
    
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    
    if (typeof value === 'number') {
      return isNaN(value) ? null : value;
    }
    
    return null;
  }
  
  private parseDate(value: any): string | null {
    if (!value) return null;
    
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      
      const parts = String(value).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (parts) {
        const [, month, day, year] = parts;
        const fullYear = year.length === 2 ? `20${year}` : year;
        const parsed = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
      }
    } catch {
      // Fall through to return null
    }
    
    return null;
  }
  
  private categorizeFee(feeType: string): string {
    const type = feeType.toLowerCase();
    
    if (type.includes('interchange')) return 'pass-through';
    if (type.includes('assessment') || type.includes('dues')) return 'pass-through';
    if (type.includes('markup') || type.includes('discount')) return 'processor';
    if (type.includes('statement') || type.includes('monthly')) return 'fixed';
    if (type.includes('pci') || type.includes('compliance')) return 'fixed';
    if (type.includes('batch') || type.includes('transaction')) return 'per-transaction';
    if (type.includes('equipment') || type.includes('terminal')) return 'equipment';
    
    return 'other';
  }
}

const defaultValidator = new StatementValidator();

export function validateAndSanitize(raw: ExtractedStatementData | null | undefined): ValidationResult {
  return defaultValidator.validateAndSanitize(raw);
}

export function getDefaultSanitizedData(): SanitizedStatementData {
  return JSON.parse(JSON.stringify(DEFAULTS));
}

export default StatementValidator;
