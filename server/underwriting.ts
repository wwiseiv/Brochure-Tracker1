// PCBancard Credit & Underwriting Policy Guidelines
// Used for AI-powered lead scoring and prohibited business warnings

export type RiskLevel = "level1" | "level2" | "level3" | "prohibited";

export interface BusinessRiskProfile {
  level: RiskLevel;
  label: string;
  description: string;
  scoreBoost: number; // Added to AI score (-50 to +20)
  requirements: string[];
  notes: string;
}

// Map business types to underwriting risk levels
// Based on PCBancard Credit & Underwriting Policy Guidelines v01.01.2026
export const BUSINESS_RISK_MAPPING: Record<string, BusinessRiskProfile> = {
  // Level 1 - Low Risk (Card Present, Retail)
  restaurant: {
    level: "level1",
    label: "Level 1 - Low Risk",
    description: "Eating places and restaurants (MCC 5812/5814)",
    scoreBoost: 15,
    requirements: [
      "Merchant Application Completed and Signed",
      "Personal Guarantee/SSN",
      "Valid Bank Account",
      "Valid Government ID",
    ],
    notes: "High transaction volume, card-present environment. Excellent fit for PayLo dual pricing.",
  },
  retail: {
    level: "level1",
    label: "Level 1 - Low Risk",
    description: "Department stores, specialty retail (various MCC codes)",
    scoreBoost: 15,
    requirements: [
      "Merchant Application Completed and Signed",
      "Personal Guarantee/SSN",
      "Valid Bank Account",
      "Valid Government ID",
    ],
    notes: "Standard retail with 70%+ card-present transactions. Great candidate for PayLo.",
  },
  service: {
    level: "level1",
    label: "Level 1 - Low Risk",
    description: "Service businesses, repair shops (MCC 7699, etc.)",
    scoreBoost: 12,
    requirements: [
      "Merchant Application Completed and Signed",
      "Personal Guarantee/SSN",
      "Valid Bank Account",
      "Valid Government ID",
    ],
    notes: "Service-based businesses with in-person payments. Good fit for PayLo.",
  },
  salon: {
    level: "level1",
    label: "Level 1 - Low Risk",
    description: "Beauty and barber shops (MCC 7230)",
    scoreBoost: 15,
    requirements: [
      "Merchant Application Completed and Signed",
      "Personal Guarantee/SSN",
      "Valid Bank Account",
      "Valid Government ID",
    ],
    notes: "High-touch customer service with tips. Dual pricing works well here.",
  },
  // Level 2 - Moderate Risk
  auto: {
    level: "level1",
    label: "Level 1 - Low Risk",
    description: "Automotive service shops (MCC 7538), tire stores (MCC 5532)",
    scoreBoost: 12,
    requirements: [
      "Merchant Application Completed and Signed",
      "Personal Guarantee/SSN",
      "Valid Bank Account",
      "Valid Government ID",
    ],
    notes: "Auto shops have higher average tickets. PayLo savings can be significant.",
  },
  convenience: {
    level: "level1",
    label: "Level 1 - Low Risk",
    description: "Convenience stores and specialty markets (MCC 5499)",
    scoreBoost: 10,
    requirements: [
      "Merchant Application Completed and Signed",
      "Personal Guarantee/SSN",
      "Valid Bank Account",
      "Valid Government ID",
    ],
    notes: "High volume, low average ticket. Already familiar with dual pricing from gas stations.",
  },
  medical: {
    level: "level2",
    label: "Level 2 - Moderate Risk",
    description: "Medical services, doctors offices (MCC 8011, 8099)",
    scoreBoost: 5,
    requirements: [
      "Merchant Application Completed and Signed",
      "Personal Guarantee/SSN",
      "Valid Bank Account",
      "Valid Government ID",
      "Last 3 Processing Statements",
      "Last 3 Bank Statements",
      "Credit Score above 550",
    ],
    notes: "Healthcare requires additional documentation. Verify no telemedicine without proper licensing.",
  },
  other: {
    level: "level2",
    label: "Level 2 - Review Required",
    description: "Business type needs manual classification",
    scoreBoost: 0,
    requirements: [
      "Merchant Application Completed and Signed",
      "Personal Guarantee/SSN",
      "Valid Bank Account",
      "Valid Government ID",
      "Additional review may be required",
    ],
    notes: "Classify business more specifically to determine accurate risk level.",
  },
};

// Prohibited business types - agents should be warned
export const PROHIBITED_BUSINESSES = [
  {
    keywords: ["cannabis", "marijuana", "dispensary", "thc", "weed"],
    name: "Cannabis/Marijuana Dispensaries",
    reason: "Products with THC are prohibited under federal law and card brand rules.",
  },
  {
    keywords: ["gambling", "casino", "betting", "lottery"],
    name: "Gambling/Casinos",
    reason: "Online gambling and unlicensed gambling establishments are prohibited.",
  },
  {
    keywords: ["kratom"],
    name: "Kratom Products",
    reason: "Kratom is a prohibited product under PCBancard underwriting guidelines.",
  },
  {
    keywords: ["delta 8", "delta-8", "delta8", "delta 10", "delta-10"],
    name: "Delta 8/10 Products",
    reason: "Delta 8/10 THC products are prohibited as primary products.",
  },
  {
    keywords: ["escort", "adult entertainment", "strip club"],
    name: "Adult Entertainment",
    reason: "Adult entertainment services require Level 3 review and additional compliance.",
  },
  {
    keywords: ["crypto", "cryptocurrency", "bitcoin exchange"],
    name: "Cryptocurrency Exchanges",
    reason: "Cryptocurrency exchanges are high-risk and require special approval.",
  },
  {
    keywords: ["payday loan", "title loan"],
    name: "Payday/Title Loans",
    reason: "Payday and title loan businesses are high-risk and often prohibited.",
  },
  {
    keywords: ["pyramid", "mlm", "multi-level marketing"],
    name: "MLM/Pyramid Schemes",
    reason: "Multi-level marketing and pyramid schemes are prohibited.",
  },
  {
    keywords: ["weapons", "guns", "firearms"],
    name: "Firearms (Requires FFL)",
    reason: "Firearms dealers are Level 3 and require valid FFL license. Not prohibited but requires additional documentation.",
    warningOnly: true, // Not fully prohibited, just needs additional review
  },
  {
    keywords: ["cbd", "cannabidiol"],
    name: "CBD Products (Level 3)",
    reason: "CBD requires Level 3 review with COA documentation, site inspection, and products must be < 0.3% THC.",
    warningOnly: true,
  },
  {
    keywords: ["tobacco", "vape", "e-cigarette", "cigar"],
    name: "Tobacco/Vape (Level 3)",
    reason: "Tobacco/vape stores are Level 3 and require additional registrations (BRAM, VIRP).",
    warningOnly: true,
  },
];

// Check if business description contains prohibited keywords
export function checkProhibitedBusiness(businessName: string, notes: string = ""): {
  isProhibited: boolean;
  isWarning: boolean;
  matches: typeof PROHIBITED_BUSINESSES;
} {
  const searchText = `${businessName} ${notes}`.toLowerCase();
  
  const matches = PROHIBITED_BUSINESSES.filter((prohibited) =>
    prohibited.keywords.some((keyword) => searchText.includes(keyword.toLowerCase()))
  );
  
  const hardProhibited = matches.filter((m) => !(m as any).warningOnly);
  const warnings = matches.filter((m) => (m as any).warningOnly);
  
  return {
    isProhibited: hardProhibited.length > 0,
    isWarning: warnings.length > 0 && hardProhibited.length === 0,
    matches,
  };
}

// Get risk profile for a business type
export function getBusinessRiskProfile(businessType: string): BusinessRiskProfile {
  return BUSINESS_RISK_MAPPING[businessType] || BUSINESS_RISK_MAPPING.other;
}

// Underwriting context for AI lead scoring
export const UNDERWRITING_AI_CONTEXT = `
## PCBancard Underwriting Risk Levels

### LEVEL 1 - LOW RISK (Best Candidates)
- Retail locations with 70%+ card-present transactions
- Average transaction < $2,500
- Monthly volume < $250,000
- Examples: Restaurants, retail stores, salons, auto shops, service businesses
- Minimal requirements: Application, SSN, bank account, ID
- SCORING: These are ideal PayLo candidates. Score higher.

### LEVEL 2 - MODERATE RISK
- Higher transaction amounts (>$2,500) or volumes (>$250K/month)
- 30%+ card-not-present or e-commerce
- Medical offices, larger businesses
- Additional requirements: 3 months statements, credit score > 550
- SCORING: Good candidates but need more documentation.

### LEVEL 3 - HIGH RISK (Proceed with Caution)
- Firearms (requires FFL)
- CBD products (requires COA, < 0.3% THC)
- Tobacco/vape/cigar stores
- Dating services
- Telemedicine
- Collections agencies
- Credit repair
- SCORING: Score lower. Requires extensive documentation and bank approval.

### PROHIBITED (Do Not Pursue)
- Cannabis/marijuana dispensaries (THC products)
- Gambling without proper licensing
- Kratom
- Delta 8/10 as primary products
- Illegal products or services
- Prior fraud accounts
- SCORING: Score 0. Agent should be warned not to pursue.

## Scoring Guidelines
- Level 1 businesses: Start with base score + 15 points
- Level 2 businesses: Base score + 5 points
- Level 3 businesses: Base score - 10 points (requires extra documentation)
- Prohibited: Score 0 and flag for agent

When analyzing notes, look for:
- Payment patterns (cash vs card volume)
- Business pain points (processing fees, equipment needs)
- Owner engagement level
- Tip handling needs (increases value of PayLo)
- High transaction volume (higher savings potential)
`;

// Generate scoring suggestions for agents based on lead score and business type
export function generateAgentSuggestions(
  businessType: string,
  score: number,
  tier: "hot" | "warm" | "cold",
  factors: string[]
): string[] {
  const profile = getBusinessRiskProfile(businessType);
  const suggestions: string[] = [];
  
  if (tier === "hot") {
    suggestions.push("This is a hot lead - prioritize follow-up within 24-48 hours");
    if (profile.level === "level1") {
      suggestions.push("Level 1 merchant: Standard application process. Minimal documentation needed.");
    }
  } else if (tier === "warm") {
    suggestions.push("Warm lead - schedule a detailed follow-up to discuss their specific needs");
    if (profile.level === "level2") {
      suggestions.push("Level 2 merchant: Will need 3 months of processing and bank statements");
    }
  } else {
    suggestions.push("Cold lead - may need nurturing. Consider educational approach about PayLo benefits.");
  }
  
  // Business-type specific suggestions
  switch (businessType) {
    case "restaurant":
      suggestions.push("Ask about tip handling - dual pricing works great with restaurants that handle tips");
      suggestions.push("Calculate their annual savings based on transaction volume");
      break;
    case "salon":
      suggestions.push("Discuss how PayLo handles tips on card transactions");
      suggestions.push("Beauty businesses love loyalty programs - mention the Profit Flywheel");
      break;
    case "auto":
      suggestions.push("Higher ticket items = higher savings. Calculate their potential annual savings");
      suggestions.push("Mention equipment upgrade opportunities from savings");
      break;
    case "medical":
      suggestions.push("Verify if telemedicine is involved (requires Level 3 review)");
      suggestions.push("Medical offices need additional documentation - prepare them");
      break;
    case "convenience":
      suggestions.push("They already see dual pricing at gas stations - this is familiar");
      suggestions.push("High volume = significant cumulative savings even on small tickets");
      break;
  }
  
  // Add underwriting requirement reminders
  if (profile.level !== "level1") {
    suggestions.push(`Underwriting note: ${profile.notes}`);
  }
  
  return suggestions;
}
