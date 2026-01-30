// ============================================
// Form Field Mapping Utilities
// ============================================
// These utilities handle mapping merchant data to form fields
// and transforming data between different formats

import { MerchantRecord, FormFieldDefinition, DocumentTemplate } from '../types';

/**
 * Get a nested value from an object using dot notation path
 * Example: getNestedValue(merchant, 'owner.firstName') => merchant.owner.firstName
 */
export const getNestedValue = (obj: any, path: string): any => {
  if (!path) return undefined;
  
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (value === null || value === undefined) return undefined;
    value = value[key];
  }
  
  return value;
};

/**
 * Set a nested value in an object using dot notation path
 * Example: setNestedValue(obj, 'owner.firstName', 'John')
 */
export const setNestedValue = (obj: any, path: string, value: any): void => {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
};

/**
 * Map merchant record data to form fields
 * Returns an object with field IDs as keys and values from merchant record
 */
export const mapMerchantToFormFields = (
  merchant: MerchantRecord,
  fields: FormFieldDefinition[]
): Record<string, any> => {
  const mappedValues: Record<string, any> = {};
  
  for (const field of fields) {
    if (field.mappedFrom) {
      const value = getNestedValue(merchant, field.mappedFrom);
      if (value !== undefined && value !== null) {
        mappedValues[field.id] = formatFieldValue(value, field.type);
      }
    }
    
    // Apply default value if no mapped value and default exists
    if (mappedValues[field.id] === undefined && field.defaultValue !== undefined) {
      mappedValues[field.id] = field.defaultValue;
    }
  }
  
  return mappedValues;
};

/**
 * Format a value based on field type
 */
export const formatFieldValue = (value: any, fieldType: string): string => {
  if (value === null || value === undefined) return '';
  
  switch (fieldType) {
    case 'phone':
      return formatPhoneNumber(String(value));
    case 'ssn':
      return formatSSN(String(value));
    case 'ein':
      return formatEIN(String(value));
    case 'currency':
      return formatCurrency(Number(value));
    case 'percentage':
      return formatPercentage(Number(value));
    case 'date':
      return formatDate(value);
    default:
      return String(value);
  }
};

/**
 * Format phone number as (XXX) XXX-XXXX
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
};

/**
 * Format SSN as XXX-XX-XXXX
 */
export const formatSSN = (ssn: string): string => {
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
  }
  return ssn;
};

/**
 * Format EIN as XX-XXXXXXX
 */
export const formatEIN = (ein: string): string => {
  const cleaned = ein.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
  }
  return ein;
};

/**
 * Format currency value
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Format percentage value
 */
export const formatPercentage = (value: number): string => {
  return `${value}%`;
};

/**
 * Format date value
 */
export const formatDate = (date: Date | string): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
};

/**
 * Parse form input value based on field type
 */
export const parseFieldValue = (value: string, fieldType: string): any => {
  switch (fieldType) {
    case 'number':
    case 'currency':
      return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
    case 'percentage':
      return parseFloat(value.replace('%', '')) || 0;
    case 'checkbox':
      return value === 'true' || value === '1';
    case 'date':
      return new Date(value);
    case 'phone':
    case 'ssn':
    case 'ein':
      return value.replace(/\D/g, '');
    default:
      return value;
  }
};

/**
 * Validate a field value based on field definition
 */
export const validateField = (
  value: any,
  field: FormFieldDefinition
): { valid: boolean; error?: string } => {
  // Check required
  if (field.required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: `${field.label} is required` };
  }
  
  // Skip further validation if value is empty and not required
  if (!value && !field.required) {
    return { valid: true };
  }
  
  const validation = field.validation;
  if (!validation) return { valid: true };
  
  // Check min/max length
  if (validation.minLength && String(value).length < validation.minLength) {
    return { valid: false, error: `${field.label} must be at least ${validation.minLength} characters` };
  }
  if (validation.maxLength && String(value).length > validation.maxLength) {
    return { valid: false, error: `${field.label} must be no more than ${validation.maxLength} characters` };
  }
  
  // Check min/max value
  if (validation.min !== undefined && Number(value) < validation.min) {
    return { valid: false, error: `${field.label} must be at least ${validation.min}` };
  }
  if (validation.max !== undefined && Number(value) > validation.max) {
    return { valid: false, error: `${field.label} must be no more than ${validation.max}` };
  }
  
  // Check pattern
  if (validation.pattern) {
    const regex = new RegExp(validation.pattern);
    if (!regex.test(String(value))) {
      return { valid: false, error: `${field.label} format is invalid` };
    }
  }
  
  // Type-specific validation
  switch (field.type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        return { valid: false, error: 'Please enter a valid email address' };
      }
      break;
    case 'phone':
      const cleanedPhone = String(value).replace(/\D/g, '');
      if (cleanedPhone.length < 10) {
        return { valid: false, error: 'Please enter a valid phone number' };
      }
      break;
    case 'ssn':
      const cleanedSSN = String(value).replace(/\D/g, '');
      if (cleanedSSN.length !== 9) {
        return { valid: false, error: 'Please enter a valid 9-digit SSN' };
      }
      break;
    case 'ein':
      const cleanedEIN = String(value).replace(/\D/g, '');
      if (cleanedEIN.length !== 9) {
        return { valid: false, error: 'Please enter a valid 9-digit EIN' };
      }
      break;
  }
  
  return { valid: true };
};

/**
 * Validate all form fields
 */
export const validateForm = (
  values: Record<string, any>,
  fields: FormFieldDefinition[]
): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  for (const field of fields) {
    const result = validateField(values[field.id], field);
    if (!result.valid && result.error) {
      errors[field.id] = result.error;
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Create a blank merchant record with default values
 */
export const createBlankMerchant = (): Partial<MerchantRecord> => ({
  status: 'lead',
  businessAddress: {
    street: '',
    city: '',
    state: '',
    zip: ''
  },
  owner: {
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  }
});

/**
 * Merge partial merchant data with existing record
 */
export const mergeMerchantData = (
  existing: MerchantRecord,
  updates: Partial<MerchantRecord>
): MerchantRecord => {
  return {
    ...existing,
    ...updates,
    businessAddress: {
      ...existing.businessAddress,
      ...updates.businessAddress
    },
    owner: {
      ...existing.owner,
      ...updates.owner
    },
    updatedAt: new Date()
  };
};

/**
 * Extract form values that can update merchant record
 */
export const extractMerchantUpdates = (
  formValues: Record<string, any>,
  fields: FormFieldDefinition[]
): Partial<MerchantRecord> => {
  const updates: any = {};
  
  for (const field of fields) {
    if (field.mappedFrom && formValues[field.id] !== undefined) {
      setNestedValue(updates, field.mappedFrom, formValues[field.id]);
    }
  }
  
  return updates;
};

/**
 * Get all documents that need signatures for a given document set
 */
export const getSignatureFields = (documents: DocumentTemplate[]): FormFieldDefinition[] => {
  const signatureFields: FormFieldDefinition[] = [];
  
  for (const doc of documents) {
    const sigFields = doc.formFields.filter(f => f.type === 'signature');
    signatureFields.push(...sigFields.map(f => ({
      ...f,
      label: `${doc.name} - ${f.label}`
    })));
  }
  
  return signatureFields;
};

/**
 * Generate a unique ID
 */
export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Combine owner first and last name
 */
export const getFullName = (owner: { firstName?: string; lastName?: string }): string => {
  const parts = [owner.firstName, owner.lastName].filter(Boolean);
  return parts.join(' ');
};

/**
 * Parse full name into first and last
 */
export const parseFullName = (fullName: string): { firstName: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
};
