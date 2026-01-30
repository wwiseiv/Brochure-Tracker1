// ============================================
// PCBancard E-Sign Document Library Types
// ============================================

// Merchant/Lead Types
export interface MerchantRecord {
  id: string;
  businessName: string;
  dbaName?: string;
  corporateLegalName?: string;
  businessAddress: Address;
  mailingAddress?: Address;
  businessPhone: string;
  businessEmail: string;
  businessWebsite?: string;
  federalTaxId?: string;
  businessType?: BusinessType;
  ownershipType?: OwnershipType;
  yearsInBusiness?: number;
  averageTicket?: number;
  annualVolume?: number;
  owner: OwnerInfo;
  status: 'lead' | 'prospect' | 'pending' | 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface OwnerInfo {
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  ssn?: string; // Will be encrypted in real implementation
  homeAddress?: Address;
  ownershipPercentage?: number;
}

export type BusinessType = 
  | 'retail'
  | 'restaurant'
  | 'service'
  | 'government'
  | 'lodging'
  | 'supermarket'
  | 'petroleum'
  | 'healthcare'
  | 'education'
  | 'other';

export type OwnershipType = 
  | 'sole_prop'
  | 's_corp'
  | 'c_corp'
  | 'llc'
  | 'llp'
  | 'partnership'
  | 'non_profit'
  | 'government'
  | 'other';

// Document Library Types
export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: DocumentCategory;
  thumbnailPath: string;
  pdfPath?: string;
  pageIndex?: number; // Which page in the master PDF
  formFields: FormFieldDefinition[];
  isRequired: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentCategory = 
  | 'application'
  | 'agreement'
  | 'equipment'
  | 'compliance'
  | 'internal'
  | 'addendum';

export interface FormFieldDefinition {
  id: string;
  fieldName: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: SelectOption[]; // For select/radio fields
  validation?: FieldValidation;
  mappedFrom?: string; // Path to merchant record field, e.g., "owner.firstName"
  pdfFieldId?: string; // Field ID in the PDF if fillable
  position?: FieldPosition; // For non-fillable PDFs
}

export type FormFieldType = 
  | 'text'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'signature'
  | 'ssn'
  | 'ein'
  | 'currency'
  | 'percentage'
  | 'textarea';

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  customValidator?: string; // Function name for custom validation
}

export interface FieldPosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
}

// E-Signature Types
export interface ESignatureRequest {
  id: string;
  merchantId: string;
  documentIds: string[];
  status: ESignStatus;
  signers: Signer[];
  externalRequestId?: string; // ID from the e-signature provider
  provider: ESignProvider;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
}

export type ESignStatus = 
  | 'draft'
  | 'pending_send'
  | 'sent'
  | 'viewed'
  | 'partially_signed'
  | 'completed'
  | 'declined'
  | 'expired'
  | 'voided';

export interface Signer {
  id: string;
  name: string;
  email: string;
  role: SignerRole;
  status: SignerStatus;
  signedAt?: Date;
  ipAddress?: string;
}

export type SignerRole = 'merchant_owner' | 'merchant_officer' | 'guarantor' | 'agent';
export type SignerStatus = 'pending' | 'sent' | 'viewed' | 'signed' | 'declined';

export type ESignProvider = 'docusign' | 'hellosign' | 'signnow' | 'pandadoc' | 'adobe_sign';

// Document Package Types
export interface DocumentPackage {
  id: string;
  name: string;
  description: string;
  documentTemplateIds: string[];
  isDefault: boolean;
  createdAt: Date;
}

// Agent Types
export interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  repId?: string;
}

// Form Submission Types
export interface FormSubmission {
  merchantId: string;
  documentId: string;
  fieldValues: Record<string, any>;
  submittedAt: Date;
  submittedBy: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// E-Sign Provider Configuration
export interface ESignProviderConfig {
  provider: ESignProvider;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  environment: 'sandbox' | 'production';
  webhookUrl?: string;
  redirectUrl?: string;
}
