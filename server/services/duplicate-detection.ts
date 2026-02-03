/**
 * Fuzzy Duplicate Detection Service
 * ==================================
 * 
 * Detects duplicate prospects using multiple matching strategies:
 * - Fuzzy business name matching (Levenshtein, Jaro-Winkler)
 * - Normalized phone number matching
 * - Address similarity scoring
 * - Configurable thresholds and weights
 */

// ============================================
// CONFIGURATION
// ============================================

export interface DuplicateDetectionConfig {
  /** Minimum overall score to consider a duplicate (0-1, default: 0.75) */
  duplicateThreshold: number;
  
  /** Minimum score to flag as potential duplicate (0-1, default: 0.6) */
  potentialDuplicateThreshold: number;
  
  /** Weight for business name similarity (default: 0.4) */
  nameWeight: number;
  
  /** Weight for phone number match (default: 0.3) */
  phoneWeight: number;
  
  /** Weight for address similarity (default: 0.2) */
  addressWeight: number;
  
  /** Weight for website/email domain match (default: 0.1) */
  domainWeight: number;
  
  /** Maximum number of duplicates to return (default: 10) */
  maxResults: number;
  
  /** Minimum name similarity to even consider (default: 0.5) */
  minNameSimilarity: number;
  
  /** Consider exact phone match as definite duplicate */
  phoneMatchIsDuplicate: boolean;
}

const DEFAULT_CONFIG: DuplicateDetectionConfig = {
  duplicateThreshold: 0.75,
  potentialDuplicateThreshold: 0.6,
  nameWeight: 0.4,
  phoneWeight: 0.3,
  addressWeight: 0.2,
  domainWeight: 0.1,
  maxResults: 10,
  minNameSimilarity: 0.5,
  phoneMatchIsDuplicate: true,
};

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Prospect {
  id?: number;
  businessName: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  website?: string | null;
  email?: string | null;
  [key: string]: any;
}

export interface DuplicateMatch {
  prospect: Prospect;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  matchDetails: {
    nameScore: number;
    nameSimilarityType: string;
    phoneScore: number;
    phoneNormalized?: string;
    addressScore: number;
    domainScore: number;
  };
  reasons: string[];
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  isPotentialDuplicate: boolean;
  matches: DuplicateMatch[];
  highestScore: number;
  checkDetails: {
    candidatesChecked: number;
    processingTime: number;
  };
}

// ============================================
// STRING SIMILARITY ALGORITHMS
// ============================================

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLength;
}

function jaroSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  
  const matchWindow = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const aMatches: boolean[] = new Array(a.length).fill(false);
  const bMatches: boolean[] = new Array(b.length).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, b.length);
    
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0;
  
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  
  return (
    (matches / a.length +
      matches / b.length +
      (matches - transpositions / 2) / matches) /
    3
  );
}

function jaroWinklerSimilarity(a: string, b: string, prefixScale = 0.1): number {
  const jaro = jaroSimilarity(a, b);
  
  let prefix = 0;
  for (let i = 0; i < Math.min(a.length, b.length, 4); i++) {
    if (a[i] === b[i]) {
      prefix++;
    } else {
      break;
    }
  }
  
  return jaro + prefix * prefixScale * (1 - jaro);
}

function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b || a.length < 2 || b.length < 2) return 0;
  
  const getBigrams = (str: string): Set<string> => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.slice(i, i + 2));
    }
    return bigrams;
  };
  
  const aBigrams = getBigrams(a);
  const bBigrams = getBigrams(b);
  
  let intersection = 0;
  for (const bigram of aBigrams) {
    if (bBigrams.has(bigram)) intersection++;
  }
  
  return (2 * intersection) / (aBigrams.size + bBigrams.size);
}

function combinedSimilarity(a: string, b: string): { score: number; type: string } {
  if (!a || !b) return { score: 0, type: 'empty' };
  
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  
  if (aLower === bLower) return { score: 1, type: 'exact' };
  
  const avgLength = (a.length + b.length) / 2;
  
  if (avgLength <= 10) {
    const score = jaroWinklerSimilarity(aLower, bLower);
    return { score, type: 'jaro-winkler' };
  } else if (avgLength <= 30) {
    const jw = jaroWinklerSimilarity(aLower, bLower);
    const lev = levenshteinSimilarity(aLower, bLower);
    return { score: (jw + lev) / 2, type: 'combined' };
  } else {
    const dice = diceCoefficient(aLower, bLower);
    const lev = levenshteinSimilarity(aLower, bLower);
    return { score: (dice + lev) / 2, type: 'dice-levenshtein' };
  }
}

// ============================================
// NORMALIZATION FUNCTIONS
// ============================================

function normalizeBusinessName(name: string): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .replace(/\b(llc|inc|corp|corporation|ltd|limited|co|company|enterprises?|group|holdings?|services?|solutions?)\b\.?/gi, '')
    .replace(/\b(the|and|of|a|an)\b/gi, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  
  return digits.slice(-10);
}

function normalizeAddress(address: string | null | undefined): string {
  if (!address) return '';
  
  return address
    .toLowerCase()
    .replace(/\bst\b\.?/g, 'street')
    .replace(/\bave\b\.?/g, 'avenue')
    .replace(/\bblvd\b\.?/g, 'boulevard')
    .replace(/\brd\b\.?/g, 'road')
    .replace(/\bdr\b\.?/g, 'drive')
    .replace(/\bln\b\.?/g, 'lane')
    .replace(/\bct\b\.?/g, 'court')
    .replace(/\bpl\b\.?/g, 'place')
    .replace(/\bcir\b\.?/g, 'circle')
    .replace(/\bhwy\b\.?/g, 'highway')
    .replace(/\bpkwy\b\.?/g, 'parkway')
    .replace(/\bn\b\.?/g, 'north')
    .replace(/\bs\b\.?/g, 'south')
    .replace(/\be\b\.?/g, 'east')
    .replace(/\bw\b\.?/g, 'west')
    .replace(/\bste\b\.?/g, 'suite')
    .replace(/\bapt\b\.?/g, 'apartment')
    .replace(/\bfl\b\.?/g, 'floor')
    .replace(/\b(suite|unit|apt|apartment|#)\s*\w+/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDomain(input: string | null | undefined): string {
  if (!input) return '';
  
  if (input.includes('@')) {
    const match = input.match(/@([^@\s]+)/);
    if (match) {
      return match[1].toLowerCase().replace(/^www\./, '');
    }
  }
  
  try {
    const url = input.startsWith('http') ? input : `https://${input}`;
    const hostname = new URL(url).hostname;
    return hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return input.toLowerCase().replace(/^www\./, '');
  }
}

function buildFullAddress(prospect: Prospect): string {
  const parts = [
    prospect.address,
    prospect.city,
    prospect.state,
    prospect.zip,
  ].filter(Boolean);
  
  return parts.join(' ');
}

// ============================================
// DUPLICATE DETECTION CLASS
// ============================================

export class DuplicateDetector {
  private config: DuplicateDetectionConfig;
  
  constructor(config: Partial<DuplicateDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  checkDuplicate(
    newProspect: Prospect,
    existingProspects: Prospect[]
  ): DuplicateCheckResult {
    const startTime = Date.now();
    const matches: DuplicateMatch[] = [];
    
    const normalizedName = normalizeBusinessName(newProspect.businessName);
    const normalizedPhone = normalizePhone(newProspect.phone);
    const normalizedAddress = normalizeAddress(buildFullAddress(newProspect));
    const domain = extractDomain(newProspect.website) || extractDomain(newProspect.email);
    
    for (const existing of existingProspects) {
      if (existing.id && newProspect.id && existing.id === newProspect.id) {
        continue;
      }
      
      const existingNormalizedName = normalizeBusinessName(existing.businessName);
      const nameResult = combinedSimilarity(normalizedName, existingNormalizedName);
      
      if (nameResult.score < this.config.minNameSimilarity) {
        continue;
      }
      
      let phoneScore = 0;
      let phoneNormalized: string | undefined;
      const existingNormalizedPhone = normalizePhone(existing.phone);
      
      if (normalizedPhone && existingNormalizedPhone) {
        if (normalizedPhone === existingNormalizedPhone) {
          phoneScore = 1;
          phoneNormalized = normalizedPhone;
        } else if (normalizedPhone.length >= 7 && existingNormalizedPhone.length >= 7) {
          const last7New = normalizedPhone.slice(-7);
          const last7Existing = existingNormalizedPhone.slice(-7);
          if (last7New === last7Existing) {
            phoneScore = 0.8;
            phoneNormalized = normalizedPhone;
          }
        }
      }
      
      const existingNormalizedAddress = normalizeAddress(buildFullAddress(existing));
      const addressScore = existingNormalizedAddress && normalizedAddress
        ? combinedSimilarity(normalizedAddress, existingNormalizedAddress).score
        : 0;
      
      const existingDomain = extractDomain(existing.website) || extractDomain(existing.email);
      const domainScore = domain && existingDomain && domain === existingDomain ? 1 : 0;
      
      const totalScore = 
        nameResult.score * this.config.nameWeight +
        phoneScore * this.config.phoneWeight +
        addressScore * this.config.addressWeight +
        domainScore * this.config.domainWeight;
      
      const isPhoneMatch = phoneScore === 1 && 
        this.config.phoneMatchIsDuplicate &&
        nameResult.score >= 0.5;
      
      if (totalScore >= this.config.potentialDuplicateThreshold || isPhoneMatch) {
        let confidence: 'high' | 'medium' | 'low';
        if (totalScore >= this.config.duplicateThreshold || isPhoneMatch) {
          confidence = 'high';
        } else if (totalScore >= this.config.potentialDuplicateThreshold + 0.1) {
          confidence = 'medium';
        } else {
          confidence = 'low';
        }
        
        const reasons: string[] = [];
        if (nameResult.score >= 0.9) {
          reasons.push('Nearly identical business name');
        } else if (nameResult.score >= 0.7) {
          reasons.push('Similar business name');
        }
        if (phoneScore === 1) {
          reasons.push('Exact phone number match');
        } else if (phoneScore >= 0.8) {
          reasons.push('Similar phone number');
        }
        if (addressScore >= 0.8) {
          reasons.push('Same or similar address');
        }
        if (domainScore === 1) {
          reasons.push('Same website/email domain');
        }
        
        matches.push({
          prospect: existing,
          score: isPhoneMatch ? Math.max(totalScore, 0.9) : totalScore,
          confidence,
          matchDetails: {
            nameScore: nameResult.score,
            nameSimilarityType: nameResult.type,
            phoneScore,
            phoneNormalized,
            addressScore,
            domainScore,
          },
          reasons,
        });
      }
    }
    
    matches.sort((a, b) => b.score - a.score);
    
    const limitedMatches = matches.slice(0, this.config.maxResults);
    const highestScore = matches.length > 0 ? matches[0].score : 0;
    
    return {
      isDuplicate: highestScore >= this.config.duplicateThreshold,
      isPotentialDuplicate: highestScore >= this.config.potentialDuplicateThreshold,
      matches: limitedMatches,
      highestScore,
      checkDetails: {
        candidatesChecked: existingProspects.length,
        processingTime: Date.now() - startTime,
      },
    };
  }
  
  batchCheckDuplicates(
    newProspects: Prospect[],
    existingProspects: Prospect[]
  ): Map<number | string, DuplicateCheckResult> {
    const results = new Map<number | string, DuplicateCheckResult>();
    
    const normalizedExisting = existingProspects.map(p => ({
      original: p,
      name: normalizeBusinessName(p.businessName),
      phone: normalizePhone(p.phone),
      address: normalizeAddress(buildFullAddress(p)),
      domain: extractDomain(p.website) || extractDomain(p.email),
    }));
    
    for (const prospect of newProspects) {
      const key = prospect.id ?? prospect.businessName;
      const result = this.checkDuplicatePreNormalized(prospect, normalizedExisting);
      results.set(key, result);
    }
    
    return results;
  }
  
  private checkDuplicatePreNormalized(
    newProspect: Prospect,
    normalizedExisting: Array<{
      original: Prospect;
      name: string;
      phone: string;
      address: string;
      domain: string;
    }>
  ): DuplicateCheckResult {
    const startTime = Date.now();
    const matches: DuplicateMatch[] = [];
    
    const normalizedName = normalizeBusinessName(newProspect.businessName);
    const normalizedPhone = normalizePhone(newProspect.phone);
    const normalizedAddress = normalizeAddress(buildFullAddress(newProspect));
    const domain = extractDomain(newProspect.website) || extractDomain(newProspect.email);
    
    for (const existing of normalizedExisting) {
      if (existing.original.id && newProspect.id && existing.original.id === newProspect.id) {
        continue;
      }
      
      const nameResult = combinedSimilarity(normalizedName, existing.name);
      
      if (nameResult.score < this.config.minNameSimilarity) {
        continue;
      }
      
      let phoneScore = 0;
      if (normalizedPhone && existing.phone) {
        if (normalizedPhone === existing.phone) {
          phoneScore = 1;
        } else if (normalizedPhone.slice(-7) === existing.phone.slice(-7)) {
          phoneScore = 0.8;
        }
      }
      
      const addressScore = existing.address && normalizedAddress
        ? combinedSimilarity(normalizedAddress, existing.address).score
        : 0;
      
      const domainScore = domain && existing.domain && domain === existing.domain ? 1 : 0;
      
      const totalScore = 
        nameResult.score * this.config.nameWeight +
        phoneScore * this.config.phoneWeight +
        addressScore * this.config.addressWeight +
        domainScore * this.config.domainWeight;
      
      const isPhoneMatch = phoneScore === 1 && 
        this.config.phoneMatchIsDuplicate &&
        nameResult.score >= 0.5;
      
      if (totalScore >= this.config.potentialDuplicateThreshold || isPhoneMatch) {
        let confidence: 'high' | 'medium' | 'low';
        if (totalScore >= this.config.duplicateThreshold || isPhoneMatch) {
          confidence = 'high';
        } else if (totalScore >= this.config.potentialDuplicateThreshold + 0.1) {
          confidence = 'medium';
        } else {
          confidence = 'low';
        }
        
        const reasons: string[] = [];
        if (nameResult.score >= 0.9) reasons.push('Nearly identical business name');
        else if (nameResult.score >= 0.7) reasons.push('Similar business name');
        if (phoneScore === 1) reasons.push('Exact phone number match');
        else if (phoneScore >= 0.8) reasons.push('Similar phone number');
        if (addressScore >= 0.8) reasons.push('Same or similar address');
        if (domainScore === 1) reasons.push('Same website/email domain');
        
        matches.push({
          prospect: existing.original,
          score: isPhoneMatch ? Math.max(totalScore, 0.9) : totalScore,
          confidence,
          matchDetails: {
            nameScore: nameResult.score,
            nameSimilarityType: nameResult.type,
            phoneScore,
            addressScore,
            domainScore,
          },
          reasons,
        });
      }
    }
    
    matches.sort((a, b) => b.score - a.score);
    const limitedMatches = matches.slice(0, this.config.maxResults);
    const highestScore = matches.length > 0 ? matches[0].score : 0;
    
    return {
      isDuplicate: highestScore >= this.config.duplicateThreshold,
      isPotentialDuplicate: highestScore >= this.config.potentialDuplicateThreshold,
      matches: limitedMatches,
      highestScore,
      checkDetails: {
        candidatesChecked: normalizedExisting.length,
        processingTime: Date.now() - startTime,
      },
    };
  }
  
  findDuplicatesInList(prospects: Prospect[]): Array<{
    prospect1: Prospect;
    prospect2: Prospect;
    score: number;
    reasons: string[];
  }> {
    const duplicates: Array<{
      prospect1: Prospect;
      prospect2: Prospect;
      score: number;
      reasons: string[];
    }> = [];
    
    const normalized = prospects.map(p => ({
      original: p,
      name: normalizeBusinessName(p.businessName),
      phone: normalizePhone(p.phone),
      address: normalizeAddress(buildFullAddress(p)),
      domain: extractDomain(p.website) || extractDomain(p.email),
    }));
    
    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        const a = normalized[i];
        const b = normalized[j];
        
        const nameResult = combinedSimilarity(a.name, b.name);
        if (nameResult.score < this.config.minNameSimilarity) continue;
        
        let phoneScore = 0;
        if (a.phone && b.phone && a.phone === b.phone) phoneScore = 1;
        
        const addressScore = a.address && b.address
          ? combinedSimilarity(a.address, b.address).score
          : 0;
        
        const domainScore = a.domain && b.domain && a.domain === b.domain ? 1 : 0;
        
        const totalScore = 
          nameResult.score * this.config.nameWeight +
          phoneScore * this.config.phoneWeight +
          addressScore * this.config.addressWeight +
          domainScore * this.config.domainWeight;
        
        if (totalScore >= this.config.potentialDuplicateThreshold) {
          const reasons: string[] = [];
          if (nameResult.score >= 0.7) reasons.push('Similar names');
          if (phoneScore === 1) reasons.push('Same phone');
          if (addressScore >= 0.8) reasons.push('Same address');
          if (domainScore === 1) reasons.push('Same domain');
          
          duplicates.push({
            prospect1: a.original,
            prospect2: b.original,
            score: totalScore,
            reasons,
          });
        }
      }
    }
    
    return duplicates.sort((a, b) => b.score - a.score);
  }
  
  updateConfig(config: Partial<DuplicateDetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  getConfig(): DuplicateDetectionConfig {
    return { ...this.config };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let detectorInstance: DuplicateDetector | null = null;

export function getDuplicateDetector(config?: Partial<DuplicateDetectionConfig>): DuplicateDetector {
  if (!detectorInstance) {
    detectorInstance = new DuplicateDetector(config);
  }
  return detectorInstance;
}

// ============================================
// UTILITY EXPORTS
// ============================================

export {
  normalizeBusinessName,
  normalizePhone,
  normalizeAddress,
  extractDomain,
  levenshteinSimilarity,
  jaroWinklerSimilarity,
  diceCoefficient,
  combinedSimilarity,
};

export default DuplicateDetector;
