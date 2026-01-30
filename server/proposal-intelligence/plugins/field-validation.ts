import type { ProposalPlugin } from "../core/plugin-manager";
import type { ProposalContext } from "../core/types";

interface ValidationResult {
  field: string;
  value: any;
  isValid: boolean;
  confidence: number;
  message?: string;
}

export const FieldValidationPlugin: ProposalPlugin = {
  id: "field-validation",
  name: "Field Validation",
  version: "1.0.0",
  stage: "validate",
  enabled: true,
  priority: 10,

  async run(context: ProposalContext): Promise<ProposalContext> {
    console.log("[FieldValidation] Validating merchant data...");
    
    const validations: ValidationResult[] = [];
    const { merchantData } = context;

    validations.push({
      field: "businessName",
      value: merchantData.businessName,
      isValid: !!merchantData.businessName && merchantData.businessName.length > 0,
      confidence: merchantData.businessName ? 1.0 : 0,
      message: merchantData.businessName ? undefined : "Business name is required"
    });

    validations.push({
      field: "ownerName",
      value: merchantData.ownerName,
      isValid: !!merchantData.ownerName,
      confidence: merchantData.ownerName ? 0.9 : 0.3,
      message: merchantData.ownerName ? undefined : "Owner name recommended for personalization"
    });

    if (merchantData.email) {
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(merchantData.email);
      validations.push({
        field: "email",
        value: merchantData.email,
        isValid: emailValid,
        confidence: emailValid ? 1.0 : 0.2,
        message: emailValid ? undefined : "Invalid email format"
      });
    }

    if (merchantData.phone) {
      const phoneClean = merchantData.phone.replace(/\D/g, "");
      const phoneValid = phoneClean.length >= 10;
      validations.push({
        field: "phone",
        value: merchantData.phone,
        isValid: phoneValid,
        confidence: phoneValid ? 1.0 : 0.4,
        message: phoneValid ? undefined : "Phone number appears incomplete"
      });
    }

    if (merchantData.website) {
      const websiteValid = /^https?:\/\//.test(merchantData.website) || 
                           /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}/.test(merchantData.website);
      validations.push({
        field: "website",
        value: merchantData.website,
        isValid: websiteValid,
        confidence: websiteValid ? 0.9 : 0.5
      });
    }

    const failedRequired = validations.filter(v => v.field === "businessName" && !v.isValid);
    if (failedRequired.length > 0) {
      context.errors.push(...failedRequired.map(v => v.message || `${v.field} is invalid`));
    }

    const warnings = validations.filter(v => !v.isValid && v.confidence > 0);
    if (warnings.length > 0) {
      context.warnings.push(...warnings.map(v => v.message || `${v.field} could not be validated`));
    }

    const overallConfidence = validations.reduce((sum, v) => sum + v.confidence, 0) / validations.length;
    
    context.audit.push({
      timestamp: new Date(),
      stage: "validate",
      plugin: this.id,
      action: "Field validation complete",
      success: failedRequired.length === 0,
      metadata: {
        validations,
        overallConfidence,
        fieldsValidated: validations.length,
        fieldsInvalid: validations.filter(v => !v.isValid).length
      }
    });

    console.log(`[FieldValidation] Validated ${validations.length} fields, confidence: ${(overallConfidence * 100).toFixed(1)}%`);
    
    return context;
  }
};

export default FieldValidationPlugin;
