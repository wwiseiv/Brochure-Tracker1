import Anthropic from "@anthropic-ai/sdk";

export interface WebsiteContext {
  url: string;
  pageTitle?: string;
  metaDescription?: string;
  bodyText: string;
}

export interface AICustomContext {
  templateName: string;
  templateCategory: string;
  merchantName: string;
  websiteContext: WebsiteContext | null;
  financials: {
    dualPricing?: { programType: string; annualSavings: string; monthlySavings?: string } | null;
    interchangePlus?: { programType: string; annualSavings: string; monthlySavings?: string } | null;
  };
  equipment: { name: string; price: string } | null;
  agentName: string;
}

export interface AIGeneratedContent {
  headline: string;
  subheadline?: string;
  savingsItems: { label: string; amount: string; note: string }[];
  equipmentItems: { name: string; detail: string }[];
  features: string[];
  customBodyCopy?: string;
}

export async function scrapeWebsiteContext(url: string): Promise<WebsiteContext | null> {
  try {
    console.log("[OnePageAI] Scraping website:", url);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PCBancard/1.0; +https://pcbancard.com)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.log("[OnePageAI] Failed to fetch website:", response.status);
      return null;
    }

    const html = await response.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);

    const pageTitle = titleMatch?.[1]?.trim();
    const metaDescription = descMatch?.[1]?.trim();

    let bodyText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    bodyText = bodyText.substring(0, 2000);

    console.log("[OnePageAI] Scraped website successfully:", pageTitle || url);
    return { url, pageTitle, metaDescription, bodyText };
  } catch (error) {
    console.error("[OnePageAI] Error scraping website:", error);
    return null;
  }
}

export async function generateAICustomContent(
  contextPackage: AICustomContext
): Promise<AIGeneratedContent | null> {
  try {
    const anthropicApiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
    const anthropicBaseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;

    if (!anthropicApiKey || !anthropicBaseUrl) {
      console.log("[OnePageAI] Anthropic API not configured");
      return null;
    }

    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
      baseURL: anthropicBaseUrl,
    });

    const systemPrompt = `You are a copywriter for PCBancard, a payment processing company. You are generating content for a one-page sales proposal/flyer.

RULES:
1. Keep all copy concise — this must fit on a single printed page.
2. NEVER invent financial numbers. Only use the exact savings amounts provided in the financial data. If no numbers are provided, use phrases like "significant savings" or "let us show you the numbers."
3. Customize the headline and body copy to resonate with the merchant's specific business type and industry.
4. Maintain a professional, benefit-focused, action-oriented tone.
5. Include the agent's name naturally in the copy where appropriate.
6. Output ONLY the text content for each section — no HTML, no formatting tags, no markdown.

OUTPUT FORMAT (respond with exactly this JSON structure):
{
  "headline": "Exclusive Offer for [Merchant Name]",
  "subheadline": "Optional subheadline tailored to their business",
  "savingsItems": [
    { "label": "Dual Pricing Program", "amount": "$655.44", "note": "in annual savings" }
  ],
  "equipmentItems": [
    { "name": "Dejavoo P1 Terminal", "detail": "Pay $295 upfront or opt for our free terminal program" }
  ],
  "features": [
    "Next-day or instant funding options",
    "Full PCI compliance handled for you"
  ],
  "customBodyCopy": "A 2-3 sentence paragraph tailored to the merchant's industry. Only include if website context is available."
}`;

    const websiteSection = contextPackage.websiteContext
      ? `WEBSITE CONTEXT:
URL: ${contextPackage.websiteContext.url}
Title: ${contextPackage.websiteContext.pageTitle || "N/A"}
Description: ${contextPackage.websiteContext.metaDescription || "N/A"}
Content: ${contextPackage.websiteContext.bodyText}`
      : "No website context available";

    const userMessage = `Generate customized one-page proposal content.

TEMPLATE: ${contextPackage.templateName} (${contextPackage.templateCategory})
MERCHANT NAME: ${contextPackage.merchantName}

${websiteSection}

FINANCIAL DATA:
${JSON.stringify(contextPackage.financials, null, 2)}

EQUIPMENT: ${contextPackage.equipment ? `${contextPackage.equipment.name} - ${contextPackage.equipment.price}` : "None selected"}

AGENT NAME: ${contextPackage.agentName}`;

    console.log("[OnePageAI] Calling Claude for AI-custom content...");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content[0];
    if (textBlock.type !== "text") {
      console.log("[OnePageAI] Unexpected response format from Claude");
      return null;
    }

    const cleanedText = textBlock.text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleanedText) as AIGeneratedContent;

    const originalAmounts: string[] = [];
    if (contextPackage.financials.dualPricing?.annualSavings) {
      originalAmounts.push(contextPackage.financials.dualPricing.annualSavings);
    }
    if (contextPackage.financials.interchangePlus?.annualSavings) {
      originalAmounts.push(contextPackage.financials.interchangePlus.annualSavings);
    }

    if (originalAmounts.length > 0 && parsed.savingsItems) {
      parsed.savingsItems = parsed.savingsItems.filter((item) => {
        const matchesOriginal = originalAmounts.some(
          (amt) => item.amount === amt
        );
        if (!matchesOriginal && item.amount && item.amount.startsWith("$")) {
          console.log("[OnePageAI] Stripping unmatched savings amount:", item.amount);
          return false;
        }
        return true;
      });

      for (const item of parsed.savingsItems) {
        if (item.amount && item.amount.startsWith("$")) {
          const closestMatch = originalAmounts.find((amt) => {
            return amt !== item.amount;
          });
          if (closestMatch && !originalAmounts.includes(item.amount)) {
            console.log("[OnePageAI] Replacing AI amount", item.amount, "with original", closestMatch);
            item.amount = closestMatch;
          }
        }
      }
    } else if (originalAmounts.length === 0 && parsed.savingsItems) {
      parsed.savingsItems = parsed.savingsItems.filter(
        (item) => !item.amount || !item.amount.startsWith("$")
      );
    }

    if (!parsed.savingsItems) parsed.savingsItems = [];
    if (!parsed.equipmentItems) parsed.equipmentItems = [];
    if (!parsed.features) parsed.features = [];

    console.log("[OnePageAI] AI content generated successfully:", parsed.headline);
    return parsed;
  } catch (error) {
    console.error("[OnePageAI] Error generating AI content:", error);
    return null;
  }
}
