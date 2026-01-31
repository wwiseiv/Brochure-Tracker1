import type { ProposalPlugin } from "../core/plugin-manager";
import type { ProposalContext } from "../core/types";
import modelRouter from "../core/model-router";

/**
 * Detect industry from business name using keyword matching
 * This helps correct AI misclassification (e.g., "Bob's Brake Muffler" → auto_repair, not restaurant)
 */
function detectIndustryFromName(businessName: string): string | null {
  const name = businessName.toLowerCase();
  
  // Auto/Automotive keywords - very specific
  if (
    name.includes('auto') ||
    name.includes('car ') ||
    name.includes('cars') ||
    name.includes('brake') ||
    name.includes('muffler') ||
    name.includes('tire') ||
    name.includes('mechanic') ||
    name.includes('transmission') ||
    name.includes('collision') ||
    name.includes('body shop') ||
    name.includes('lube') ||
    name.includes('oil change') ||
    name.includes('automotive') ||
    name.includes('motor') ||
    name.includes('vehicle') ||
    (name.includes('repair') && !name.includes('computer') && !name.includes('phone'))
  ) {
    return 'auto_repair';
  }
  
  // Restaurant keywords
  if (
    name.includes('restaurant') ||
    name.includes('cafe') ||
    name.includes('diner') ||
    name.includes('bistro') ||
    name.includes('grill') ||
    name.includes('pizza') ||
    name.includes('burger') ||
    name.includes('taco') ||
    name.includes('sushi') ||
    name.includes('kitchen') ||
    name.includes('eatery') ||
    name.includes('bbq') ||
    name.includes('steakhouse') ||
    name.includes('bakery') ||
    name.includes('food')
  ) {
    return 'restaurant';
  }
  
  // Salon/Spa keywords
  if (
    name.includes('salon') ||
    name.includes('spa') ||
    name.includes('hair') ||
    name.includes('nail') ||
    name.includes('beauty') ||
    name.includes('barber') ||
    name.includes('cuts')
  ) {
    return 'salon';
  }
  
  // Healthcare keywords
  if (
    name.includes('medical') ||
    name.includes('clinic') ||
    name.includes('dental') ||
    name.includes('doctor') ||
    name.includes('chiro') ||
    name.includes('therapy') ||
    name.includes('physician') ||
    name.includes('orthodont') ||
    name.includes('optometr') ||
    name.includes('veterinar') ||
    name.includes('pharmacy')
  ) {
    return 'healthcare';
  }
  
  // Construction keywords
  if (
    name.includes('construction') ||
    name.includes('plumbing') ||
    name.includes('plumber') ||
    name.includes('electric') ||
    name.includes('hvac') ||
    name.includes('roofing') ||
    name.includes('contractor') ||
    name.includes('landscap') ||
    name.includes('building') ||
    name.includes('painting') ||
    name.includes('flooring')
  ) {
    return 'construction';
  }
  
  // Retail keywords
  if (
    name.includes('store') ||
    name.includes('shop') ||
    name.includes('market') ||
    name.includes('boutique') ||
    name.includes('outlet')
  ) {
    return 'retail';
  }
  
  // Fitness keywords
  if (
    name.includes('gym') ||
    name.includes('fitness') ||
    name.includes('yoga') ||
    name.includes('crossfit') ||
    name.includes('training')
  ) {
    return 'fitness';
  }
  
  // Lodging keywords
  if (
    name.includes('hotel') ||
    name.includes('motel') ||
    name.includes('inn') ||
    name.includes('lodge') ||
    name.includes('resort')
  ) {
    return 'lodging';
  }
  
  return null; // No match - let AI decide
}

/**
 * Extract phone number from text - separate from address
 */
function extractPhoneNumber(text: string): string | null {
  const phonePatterns = [
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    /\d{3}[-.\s]\d{3}[-.\s]\d{4}/,
    /\+1[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
  ];
  
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return null;
}

/**
 * Clean address by removing phone numbers and extra content
 */
function cleanAddress(address: string): string {
  // Remove phone number patterns from address
  let cleaned = address
    .replace(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '')
    .replace(/Phone\s*Number:?\s*/gi, '')
    .replace(/Phone:?\s*/gi, '')
    .replace(/Tel:?\s*/gi, '')
    .replace(/Call:?\s*/gi, '')
    .replace(/Address:\s*/gi, '')
    .trim();
  
  // Remove trailing punctuation and extra spaces
  cleaned = cleaned.replace(/[,\s]+$/, '').replace(/\s+/g, ' ');
  
  return cleaned;
}

/**
 * Check if description is a placeholder or invalid
 */
function isValidDescription(description: string | undefined | null): boolean {
  if (!description) return false;
  const lower = description.toLowerCase();
  return !(
    lower.includes('{meta') ||
    lower.includes('{description}') ||
    lower.includes('meta description') ||
    lower.includes('undefined') ||
    lower === 'none' ||
    lower === 'n/a' ||
    description.length < 10
  );
}

export const WebScraperPlugin: ProposalPlugin = {
  id: "web-scraper",
  name: "Website Scraper",
  version: "1.0.0",
  stage: "enrich",
  enabled: true,
  priority: 20,

  async run(context: ProposalContext): Promise<ProposalContext> {
    const website = context.merchantData.website;
    
    if (!website) {
      console.log("[WebScraper] No website provided, skipping enrichment");
      return context;
    }

    console.log(`[WebScraper] Scraping website: ${website}`);

    try {
      const normalizedUrl = website.startsWith("http") ? website : `https://${website}`;
      
      const response = await fetch(normalizedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ProposalBot/1.0)"
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        console.warn(`[WebScraper] Failed to fetch website: ${response.status}`);
        context.warnings.push(`Could not access website: ${response.status}`);
        return context;
      }

      const html = await response.text();

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
      const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);

      const cleanHtml = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 5000);

      const aiResponse = await modelRouter.route({
        type: "extraction",
        prompt: `Analyze this business website content and extract key information:

Website: ${website}
Title: ${titleMatch?.[1] || "Unknown"}
Meta Description: ${descMatch?.[1] || ogDescMatch?.[1] || "None"}

Page Content (truncated):
${cleanHtml}

Extract and return as JSON:
{
  "businessDescription": "2-3 sentence description of what the business does. Must be actual content, not a placeholder.",
  "services": ["list", "of", "main", "services"],
  "brandLanguage": "professional/casual/luxury/budget-friendly",
  "socialProof": ["any testimonials or credentials mentioned"],
  "industryCategory": "auto_repair/restaurant/retail/salon/healthcare/construction/fitness/lodging/professional/other",
  "streetAddress": "street address only, no phone numbers",
  "city": "city name",
  "state": "state abbreviation",
  "zip": "zip code",
  "phone": "phone number in format (XXX) XXX-XXXX"
}

IMPORTANT: 
- For industryCategory, detect based on the actual business type. Auto shops, mechanics, brake/muffler shops = "auto_repair". Restaurants, cafes, food service = "restaurant".
- Keep address and phone SEPARATE - do not combine them.
- Only return factual information found on the page.`,
        systemPrompt: "You are a business analyst. Extract factual information only. Return valid JSON."
      });

      try {
        const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extracted = JSON.parse(jsonMatch[0]);
          
          // Only use description if it's valid (not a placeholder)
          const description = isValidDescription(extracted.businessDescription) 
            ? extracted.businessDescription 
            : null;
          
          context.enrichedData = {
            ...context.enrichedData,
            businessDescription: description,
            services: extracted.services,
            brandLanguage: extracted.brandLanguage,
            socialProof: extracted.socialProof
          };

          // Priority 1: User-provided industry override
          // Priority 2: Keyword-based detection from business name
          // Priority 3: AI-detected industry
          if (!context.merchantData.industry) {
            const businessName = context.merchantData.businessName || titleMatch?.[1] || "";
            const keywordIndustry = detectIndustryFromName(businessName);
            
            if (keywordIndustry) {
              context.merchantData.industry = keywordIndustry;
              console.log(`[WebScraper] Industry detected from business name keywords: ${keywordIndustry}`);
            } else if (extracted.industryCategory) {
              context.merchantData.industry = extracted.industryCategory;
              console.log(`[WebScraper] Industry from AI: ${extracted.industryCategory}`);
            }
          }
          
          // Build clean address from structured fields
          if (!context.merchantData.address) {
            const addressParts = [];
            if (extracted.streetAddress) addressParts.push(extracted.streetAddress);
            if (extracted.city) addressParts.push(extracted.city);
            if (extracted.state) addressParts.push(extracted.state);
            if (extracted.zip) addressParts.push(extracted.zip);
            
            if (addressParts.length > 0) {
              // Format: "123 Main St, City, ST 12345"
              let formattedAddress = '';
              if (extracted.streetAddress) {
                formattedAddress = extracted.streetAddress;
                if (extracted.city || extracted.state || extracted.zip) {
                  formattedAddress += ', ';
                }
              }
              if (extracted.city) {
                formattedAddress += extracted.city;
                if (extracted.state || extracted.zip) {
                  formattedAddress += ', ';
                }
              }
              if (extracted.state) {
                formattedAddress += extracted.state;
                if (extracted.zip) {
                  formattedAddress += ' ';
                }
              }
              if (extracted.zip) {
                formattedAddress += extracted.zip;
              }
              
              // Clean any phone numbers that might have slipped in
              context.merchantData.address = cleanAddress(formattedAddress);
            }
          }
          
          // Set phone number separately
          if (extracted.phone && !context.merchantData.phone) {
            context.merchantData.phone = extracted.phone;
          }
        }
      } catch (parseError) {
        console.warn("[WebScraper] Failed to parse AI extraction:", parseError);
      }

      // Try multiple patterns to find logo
      let logoUrl: string | null = null;
      
      // Pattern 1: og:image
      if (ogImageMatch?.[1]) {
        logoUrl = ogImageMatch[1];
      }
      
      // Pattern 2: Look for logo in img tags (common patterns)
      if (!logoUrl) {
        const logoPatterns = [
          /<img[^>]*class="[^"]*logo[^"]*"[^>]*src="([^"]+)"/i,
          /<img[^>]*id="[^"]*logo[^"]*"[^>]*src="([^"]+)"/i,
          /<img[^>]*alt="[^"]*logo[^"]*"[^>]*src="([^"]+)"/i,
          /<img[^>]*src="([^"]+)"[^>]*class="[^"]*logo[^"]*"/i,
          /<img[^>]*src="([^"]+logo[^"]+)"/i,
          /<link[^>]*rel="icon"[^>]*href="([^"]+)"/i
        ];
        
        for (const pattern of logoPatterns) {
          const match = html.match(pattern);
          if (match?.[1]) {
            logoUrl = match[1];
            break;
          }
        }
      }
      
      if (logoUrl) {
        // Make URL absolute if relative
        if (logoUrl.startsWith('/')) {
          const urlObj = new URL(normalizedUrl);
          logoUrl = `${urlObj.origin}${logoUrl}`;
        } else if (!logoUrl.startsWith('http')) {
          const urlObj = new URL(normalizedUrl);
          logoUrl = `${urlObj.origin}/${logoUrl}`;
        }
        
        context.enrichedData.logo = {
          url: logoUrl,
          format: logoUrl.split(".").pop()?.split('?')[0] || "unknown",
          confidence: ogImageMatch?.[1] ? 0.6 : 0.4
        };
        console.log(`[WebScraper] Logo found: ${logoUrl}`);
      }

      context.audit.push({
        timestamp: new Date(),
        stage: "enrich",
        plugin: this.id,
        model: aiResponse.model,
        action: "Website scraped and analyzed",
        success: true,
        metadata: {
          website,
          hasDescription: !!context.enrichedData.businessDescription,
          hasServices: (context.enrichedData.services?.length || 0) > 0,
          hasLogo: !!context.enrichedData.logo
        }
      });

      console.log("[WebScraper] Website enrichment complete");

    } catch (error) {
      console.error("[WebScraper] Error:", error);
      context.warnings.push(`Website scraping failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return context;
  }
};

export default WebScraperPlugin;
