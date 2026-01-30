import dns from "dns/promises";

export interface BusinessResearch {
  researchStatus: "complete" | "partial" | "minimal" | "failed";
  logoUrl?: string;
  businessDescription?: string;
  industryType?: string;
  servicesProducts?: string[];
  brandColors?: string[];
  toneRecommendation?: string;
  yearsInBusiness?: string;
  sourceUrls?: string[];
  error?: string;
}

function isPrivateIP(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p))) {
    return false;
  }
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 0) return true;
  return false;
}

function validateUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { valid: false, error: "URL must use http or https protocol" };
    }
    
    const hostname = url.hostname.toLowerCase();
    
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") {
      return { valid: false, error: "URLs pointing to localhost are not allowed" };
    }
    
    const privateIpPatterns = [
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/,
      /^192\.168\.\d{1,3}\.\d{1,3}$/,
      /^169\.254\.\d{1,3}\.\d{1,3}$/,
      /^::1$/,
      /^fc00:/i,
      /^fd00:/i,
      /^fe80:/i,
    ];
    
    for (const pattern of privateIpPatterns) {
      if (pattern.test(hostname)) {
        return { valid: false, error: "URLs pointing to private/internal IP addresses are not allowed" };
      }
    }
    
    const internalDomains = [".local", ".internal", ".corp", ".lan", ".home", ".localdomain"];
    for (const domain of internalDomains) {
      if (hostname.endsWith(domain)) {
        return { valid: false, error: "URLs pointing to internal domains are not allowed" };
      }
    }
    
    const metadataEndpoints = ["169.254.169.254", "metadata.google.internal", "metadata.azure.internal"];
    if (metadataEndpoints.includes(hostname)) {
      return { valid: false, error: "URLs pointing to cloud metadata endpoints are not allowed" };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: "Invalid URL format" };
  }
}

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  restaurant: ["restaurant", "food", "dining", "menu", "cuisine", "chef", "eat", "dinner", "lunch", "breakfast", "catering", "pizza", "burger", "sushi", "cafe", "coffee"],
  retail: ["shop", "store", "buy", "products", "sale", "merchandise", "clothing", "fashion", "accessories", "jewelry", "boutique", "outlet"],
  service: ["service", "consulting", "professional", "solutions", "expertise", "agency", "firm"],
  medical: ["health", "medical", "doctor", "clinic", "healthcare", "dental", "therapy", "wellness", "hospital", "pharmacy", "veterinary"],
  salon: ["salon", "spa", "beauty", "hair", "nails", "massage", "skincare", "barber", "grooming"],
  auto: ["auto", "car", "vehicle", "automotive", "repair", "mechanic", "dealership", "tire", "oil change"],
  convenience: ["convenience", "grocery", "market", "liquor", "gas station", "quick", "corner store"],
  technology: ["software", "tech", "digital", "app", "cloud", "data", "IT", "computer", "programming"],
  construction: ["construction", "contractor", "building", "renovation", "plumbing", "electrical", "HVAC", "roofing"],
  legal: ["law", "attorney", "lawyer", "legal", "litigation", "counsel"],
  finance: ["finance", "accounting", "tax", "investment", "insurance", "mortgage", "bank", "loan"],
  education: ["education", "school", "training", "tutoring", "learning", "academy", "courses"],
  fitness: ["gym", "fitness", "workout", "training", "yoga", "pilates", "crossfit", "personal trainer"],
  hospitality: ["hotel", "motel", "lodging", "hospitality", "accommodation", "resort", "inn"],
  entertainment: ["entertainment", "event", "party", "music", "DJ", "photography", "video", "wedding"],
};

const TONE_KEYWORDS: Record<string, { keywords: string[]; recommendation: string }> = {
  professional: {
    keywords: ["professional", "expertise", "trusted", "experienced", "certified", "licensed", "quality"],
    recommendation: "Professional and authoritative - emphasize expertise and reliability",
  },
  friendly: {
    keywords: ["family", "community", "welcome", "friendly", "local", "neighborhood", "personal"],
    recommendation: "Warm and approachable - focus on relationships and personal service",
  },
  luxury: {
    keywords: ["luxury", "premium", "exclusive", "elite", "finest", "bespoke", "curated"],
    recommendation: "Sophisticated and exclusive - highlight quality and premium experience",
  },
  value: {
    keywords: ["affordable", "value", "savings", "discount", "budget", "deal", "price"],
    recommendation: "Value-focused - emphasize cost savings and great deals",
  },
  innovative: {
    keywords: ["innovative", "cutting-edge", "modern", "technology", "advanced", "new", "latest"],
    recommendation: "Forward-thinking and modern - emphasize innovation and technology",
  },
};

async function fetchWithTimeout(url: string, timeoutMs: number = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BusinessResearchBot/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractMetaContent(html: string, name: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["']`, "i"),
    new RegExp(`<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${name}["']`, "i"),
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

function extractFirstParagraph(html: string): string | undefined {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return undefined;
  
  const body = bodyMatch[1]
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "");
  
  const pMatch = body.match(/<p[^>]*>([^<]{50,})<\/p>/i);
  if (pMatch && pMatch[1]) {
    return pMatch[1].replace(/\s+/g, " ").trim().substring(0, 500);
  }
  
  return undefined;
}

function extractLogoUrl(html: string, baseUrl: string): string | undefined {
  const urlObj = new URL(baseUrl);
  const baseOrigin = urlObj.origin;
  
  const resolveUrl = (path: string): string => {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    if (path.startsWith("//")) {
      return urlObj.protocol + path;
    }
    if (path.startsWith("/")) {
      return baseOrigin + path;
    }
    return baseOrigin + "/" + path;
  };
  
  const ogImage = extractMetaContent(html, "og:image");
  if (ogImage) {
    return resolveUrl(ogImage);
  }
  
  const appleTouchIcon = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
  if (appleTouchIcon && appleTouchIcon[1]) {
    return resolveUrl(appleTouchIcon[1]);
  }
  
  const faviconPatterns = [
    /<link[^>]*rel=["']icon["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*rel=["']shortcut icon["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']icon["']/i,
  ];
  
  for (const pattern of faviconPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return resolveUrl(match[1]);
    }
  }
  
  const logoImg = html.match(/<img[^>]*(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i);
  if (logoImg && logoImg[1]) {
    return resolveUrl(logoImg[1]);
  }
  
  return baseOrigin + "/favicon.ico";
}

function inferIndustry(content: string): string | undefined {
  const lowerContent = content.toLowerCase();
  
  let bestMatch: { industry: string; score: number } | undefined;
  
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      const matches = lowerContent.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { industry, score };
    }
  }
  
  return bestMatch?.industry;
}

function inferTone(content: string): string | undefined {
  const lowerContent = content.toLowerCase();
  
  let bestMatch: { tone: string; score: number; recommendation: string } | undefined;
  
  for (const [tone, { keywords, recommendation }] of Object.entries(TONE_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        score++;
      }
    }
    
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { tone, score, recommendation };
    }
  }
  
  return bestMatch?.recommendation;
}

function extractServicesProducts(html: string): string[] {
  const services: Set<string> = new Set();
  
  const listItems = html.match(/<li[^>]*>([^<]{10,100})<\/li>/gi);
  if (listItems) {
    for (const item of listItems.slice(0, 10)) {
      const textMatch = item.match(/<li[^>]*>([^<]+)<\/li>/i);
      if (textMatch && textMatch[1]) {
        const text = textMatch[1].trim();
        if (text.length >= 10 && text.length <= 100 && !text.includes("http")) {
          services.add(text);
        }
      }
    }
  }
  
  const h2s = html.match(/<h2[^>]*>([^<]{5,50})<\/h2>/gi);
  if (h2s) {
    for (const h2 of h2s.slice(0, 5)) {
      const textMatch = h2.match(/<h2[^>]*>([^<]+)<\/h2>/i);
      if (textMatch && textMatch[1]) {
        const text = textMatch[1].trim();
        if (text.length >= 5 && text.length <= 50) {
          services.add(text);
        }
      }
    }
  }
  
  return Array.from(services).slice(0, 10);
}

function extractBrandColors(html: string): string[] {
  const colors: Set<string> = new Set();
  
  const hexMatches = html.match(/#[0-9A-Fa-f]{6}\b/g);
  if (hexMatches) {
    for (const color of hexMatches.slice(0, 20)) {
      if (color !== "#000000" && color !== "#ffffff" && color !== "#FFFFFF") {
        colors.add(color.toUpperCase());
      }
    }
  }
  
  return Array.from(colors).slice(0, 5);
}

export async function researchBusiness(
  websiteUrl: string,
  businessName?: string,
  industryGuess?: string
): Promise<BusinessResearch> {
  const sourceUrls: string[] = [];
  
  try {
    let normalizedUrl = websiteUrl.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = "https://" + normalizedUrl;
    }
    
    const urlValidation = validateUrl(normalizedUrl);
    if (!urlValidation.valid) {
      return {
        researchStatus: "failed",
        industryType: industryGuess,
        businessDescription: businessName ? `${businessName} business` : undefined,
        sourceUrls: [],
        error: urlValidation.error || "Invalid URL",
      };
    }
    
    const hostname = new URL(normalizedUrl).hostname;
    try {
      const { address } = await dns.lookup(hostname);
      if (isPrivateIP(address)) {
        return {
          researchStatus: "failed",
          industryType: industryGuess,
          businessDescription: businessName ? `${businessName} business` : undefined,
          sourceUrls: [],
          error: "Invalid URL (resolves to private IP)",
        };
      }
    } catch (dnsError: any) {
      return {
        researchStatus: "failed",
        industryType: industryGuess,
        businessDescription: businessName ? `${businessName} business` : undefined,
        sourceUrls: [],
        error: `DNS resolution failed: ${dnsError.message || "Unknown error"}`,
      };
    }
    
    sourceUrls.push(normalizedUrl);
    
    const response = await fetchWithTimeout(normalizedUrl, 5000);
    
    if (!response.ok) {
      return {
        researchStatus: "minimal",
        industryType: industryGuess,
        businessDescription: businessName ? `${businessName} business` : undefined,
        sourceUrls,
        error: `Website returned status ${response.status}`,
      };
    }
    
    const html = await response.text();
    
    const description = 
      extractMetaContent(html, "description") ||
      extractMetaContent(html, "og:description") ||
      extractFirstParagraph(html);
    
    const logoUrl = extractLogoUrl(html, normalizedUrl);
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : undefined;
    
    const fullContent = [
      description || "",
      pageTitle || "",
      html.substring(0, 10000),
    ].join(" ");
    
    const inferredIndustry = inferIndustry(fullContent) || industryGuess;
    const toneRecommendation = inferTone(fullContent);
    const servicesProducts = extractServicesProducts(html);
    const brandColors = extractBrandColors(html);
    
    const yearMatch = html.match(/(?:since|established|founded|est\.?)\s*(?:in\s+)?(\d{4})/i);
    const yearsInBusiness = yearMatch ? yearMatch[1] : undefined;
    
    let researchStatus: "complete" | "partial" | "minimal" = "complete";
    if (!description && !inferredIndustry) {
      researchStatus = "minimal";
    } else if (!description || !inferredIndustry || servicesProducts.length === 0) {
      researchStatus = "partial";
    }
    
    return {
      researchStatus,
      logoUrl,
      businessDescription: description || (businessName ? `${businessName} business` : undefined),
      industryType: inferredIndustry,
      servicesProducts: servicesProducts.length > 0 ? servicesProducts : undefined,
      brandColors: brandColors.length > 0 ? brandColors : undefined,
      toneRecommendation,
      yearsInBusiness,
      sourceUrls,
    };
    
  } catch (error: any) {
    const errorMessage = error.name === "AbortError" 
      ? "Request timed out after 5 seconds"
      : error.message || "Unknown error occurred";
    
    return {
      researchStatus: "failed",
      industryType: industryGuess,
      businessDescription: businessName ? `${businessName} business` : undefined,
      sourceUrls,
      error: errorMessage,
    };
  }
}
