export interface ProposalContext {
  id: string;
  userId: string;
  organizationId: number;
  merchantData: MerchantData;
  enrichedData: EnrichedData;
  pricingData: PricingData;
  selectedEquipment?: EquipmentSelection;
  salesperson: SalespersonInfo;
  outputFormat: "pdf" | "docx" | "html";
  stage: ProposalStage;
  audit: AuditEntry[];
  citations: Citation[];
  errors: string[];
  warnings: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantData {
  businessName: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  industry?: string;
  monthlyVolume?: number;
  averageTicket?: number;
  repNotes?: string;
}

export interface EnrichedData {
  businessDescription?: string;
  services?: string[];
  brandLanguage?: string;
  socialProof?: string[];
  logo?: LogoData;
  competitorInfo?: string;
  industryInsights?: string;
}

export interface LogoData {
  url: string;
  format: string;
  confidence: number;
}

export interface PricingData {
  currentProcessor?: string;
  currentRates?: {
    qualifiedRate?: number;
    midQualifiedRate?: number;
    nonQualifiedRate?: number;
    monthlyFee?: number;
    transactionFee?: number;
  };
  proposedProgram?: "dual_pricing" | "interchange_plus" | "flat_rate";
  projectedSavings?: number;
  citations?: Citation[];
}

export interface EquipmentSelection {
  productId: number;
  productName: string;
  vendor: string;
  price?: number;
  features?: string[];
}

export interface SalespersonInfo {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
}

export type ProposalStage = 
  | "init"
  | "validate" 
  | "enrich" 
  | "reason" 
  | "compile" 
  | "complete" 
  | "error";

export interface AuditEntry {
  timestamp: Date;
  stage: ProposalStage;
  plugin: string;
  model?: string;
  action: string;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface Citation {
  source: string;
  reference: string;
  confidence: number;
}

export type ModelProvider = "claude" | "gemini" | "openai";

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ModelResponse {
  content: string;
  model: string;
  provider: ModelProvider;
  tokensUsed?: number;
  latencyMs?: number;
}
