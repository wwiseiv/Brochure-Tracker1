import type { ProposalPlugin } from "../core/plugin-manager";
import type { ProposalContext } from "../core/types";
import modelRouter from "../core/model-router";

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
  "businessDescription": "2-3 sentence description of what the business does",
  "services": ["list", "of", "main", "services"],
  "brandLanguage": "professional/casual/luxury/budget-friendly",
  "socialProof": ["any testimonials or credentials mentioned"],
  "industryCategory": "retail/restaurant/service/healthcare/etc"
}`,
        systemPrompt: "You are a business analyst. Extract factual information only. Return valid JSON."
      });

      try {
        const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extracted = JSON.parse(jsonMatch[0]);
          
          context.enrichedData = {
            ...context.enrichedData,
            businessDescription: extracted.businessDescription,
            services: extracted.services,
            brandLanguage: extracted.brandLanguage,
            socialProof: extracted.socialProof
          };

          if (extracted.industryCategory && !context.merchantData.industry) {
            context.merchantData.industry = extracted.industryCategory;
          }
        }
      } catch (parseError) {
        console.warn("[WebScraper] Failed to parse AI extraction:", parseError);
      }

      if (ogImageMatch?.[1]) {
        context.enrichedData.logo = {
          url: ogImageMatch[1],
          format: ogImageMatch[1].split(".").pop() || "unknown",
          confidence: 0.6
        };
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
