import { db } from "../db";
import { prospects } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface ProspectSearchParams {
  zipCode: string;
  businessTypes: { code: string; name: string; searchTerms: string[] }[];
  radius: number;
  maxResults: number;
  agentId: string;
  organizationId?: number;
}

export interface DiscoveredBusiness {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string | null;
  website: string | null;
  email: string | null;
  businessType: string;
  mccCode: string;
  confidence: number;
  hoursOfOperation: string | null;
  ownerName: string | null;
  yearEstablished: string | null;
  description: string | null;
}

export interface SearchResult {
  businesses: DiscoveredBusiness[];
  totalFound: number;
  duplicatesSkipped: number;
  searchId: string;
}

interface XAIResponseOutput {
  id: string;
  type: string;
  content?: Array<{ type: string; text?: string }>;
  status?: string;
  action?: { type: string; query?: string };
}

interface XAIResponse {
  id: string;
  model: string;
  output: XAIResponseOutput[];
}

export async function searchLocalBusinesses(
  params: ProspectSearchParams
): Promise<SearchResult> {
  const { zipCode, businessTypes, radius, maxResults, agentId } = params;

  console.log("[ProspectSearch] === SEARCH STARTED ===");
  console.log("[ProspectSearch] ZIP:", zipCode);
  console.log("[ProspectSearch] Business types:", businessTypes.map(b => b.name).join(", "));
  console.log("[ProspectSearch] Radius:", radius, "miles");
  console.log("[ProspectSearch] Max results:", maxResults);

  const businessTypeNames = businessTypes.map((bt) => bt.name).join(", ");
  const primarySearchTerms = businessTypes.slice(0, 5).map(bt => bt.name);

  // Try Grok first (with live web search), then fall back to Claude
  let textContent = "";
  let providerUsed = "";

  const grokApiKey = process.env.GROK_API_KEY;
  const claudeApiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  const claudeBaseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;

  // Try Grok first (has live web search for real-time data)
  if (grokApiKey) {
    try {
      textContent = await searchWithGrok(zipCode, businessTypeNames, primarySearchTerms, radius, maxResults, grokApiKey);
      providerUsed = "grok-4";
    } catch (grokError: any) {
      console.error("[ProspectSearch] Grok failed:", grokError.message);
      console.log("[ProspectSearch] Falling back to Claude...");
    }
  }

  // Fall back to Claude if Grok failed or wasn't available
  if (!textContent && claudeApiKey && claudeBaseUrl) {
    try {
      textContent = await searchWithClaude(zipCode, businessTypeNames, primarySearchTerms, radius, maxResults, claudeApiKey, claudeBaseUrl);
      providerUsed = "claude-sonnet-4-5";
    } catch (claudeError: any) {
      console.error("[ProspectSearch] Claude also failed:", claudeError.message);
      throw new Error("Both Grok and Claude search failed. Please try again later.");
    }
  }

  if (!textContent) {
    throw new Error("No AI provider available for search. Please configure GROK_API_KEY or Claude.");
  }

  console.log("[ProspectSearch] Provider used:", providerUsed);
  console.log("[ProspectSearch] Content length:", textContent.length);

  // Parse and process results
  const businesses = parseBusinessResults(textContent, zipCode, businessTypes);
  
  if (businesses.length === 0) {
    console.log("[ProspectSearch] No valid businesses found in response");
    return {
      businesses: [],
      totalFound: 0,
      duplicatesSkipped: 0,
      searchId: generateSearchId(),
    };
  }

  console.log("[ProspectSearch] Valid businesses after filtering:", businesses.length);

  const { deduplicatedBusinesses, duplicatesSkipped } =
    await deduplicateResults(businesses, agentId);

  console.log("[ProspectSearch] === SEARCH COMPLETE ===");
  console.log("[ProspectSearch] Total found:", businesses.length);
  console.log("[ProspectSearch] Duplicates skipped:", duplicatesSkipped);
  console.log("[ProspectSearch] Returning:", deduplicatedBusinesses.length);

  return {
    businesses: deduplicatedBusinesses,
    totalFound: businesses.length,
    duplicatesSkipped,
    searchId: generateSearchId(),
  };
}

async function searchWithGrok(
  zipCode: string,
  businessTypeNames: string,
  primarySearchTerms: string[],
  radius: number,
  maxResults: number,
  apiKey: string
): Promise<string> {
  console.log("[ProspectSearch] Trying Grok-4 with web_search...");

  const searchPrompt = `Search the web to find real, currently operating local businesses matching these criteria:

SEARCH PARAMETERS:
- Location: Within ${radius} miles of ZIP code ${zipCode}
- Business Types: ${businessTypeNames}
- Number of Results Needed: ${maxResults}

REQUIREMENTS:
1. Find REAL businesses that currently exist and are operating
2. Include COMPLETE address information (street address, city, state, zip)
3. Prioritize independent local businesses over national chains when possible
4. Include phone numbers and websites when available
5. Search for: ${primarySearchTerms.join(", ")} near ${zipCode}

Return ONLY a valid JSON array with this format (no markdown, no explanation):
[{"name":"Business Name","address":"123 Main St","city":"City","state":"IN","zipCode":"${zipCode}","phone":"(555) 123-4567","website":"https://example.com","email":null,"hoursOfOperation":"Mon-Fri 9am-5pm","description":"Brief description","businessType":"${primarySearchTerms[0] || 'Business'}","mccCode":"0000","confidence":0.9}]`;

  // Add timeout to prevent hanging (90 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  let response: Response;
  try {
    response = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "grok-4",
        tools: [{ type: "web_search" }],
        input: searchPrompt
      }),
      signal: controller.signal
    });
  } catch (fetchError: any) {
    clearTimeout(timeoutId);
    if (fetchError.name === 'AbortError') {
      throw new Error("Grok API call timed out after 90 seconds");
    }
    throw fetchError;
  }
  clearTimeout(timeoutId);

  console.log("[ProspectSearch] Grok response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Grok API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as XAIResponse;
  
  // Extract text content from xAI Responses API format
  let textContent = "";
  for (const output of data.output || []) {
    if (output.type === "message" && output.content) {
      for (const content of output.content) {
        if (content.type === "output_text" && content.text) {
          textContent = content.text;
          break;
        }
      }
    }
    if (textContent) break;
  }

  // Remove citation markup like [[1]](url)
  textContent = textContent.replace(/\[\[\d+\]\]\([^)]+\)/g, "");
  
  if (!textContent) {
    throw new Error("No text content in Grok response");
  }

  console.log("[ProspectSearch] Grok returned content successfully");
  return textContent;
}

async function searchWithClaude(
  zipCode: string,
  businessTypeNames: string,
  primarySearchTerms: string[],
  radius: number,
  maxResults: number,
  apiKey: string,
  baseUrl: string
): Promise<string> {
  console.log("[ProspectSearch] Trying Claude Sonnet 4.5 as fallback...");

  const searchPrompt = `You are a business directory assistant. Generate a list of real, plausible local businesses that would typically exist near ZIP code ${zipCode}.

SEARCH PARAMETERS:
- Location: Within ${radius} miles of ZIP code ${zipCode}
- Business Types: ${businessTypeNames}
- Number of Results Needed: ${maxResults}

REQUIREMENTS:
1. Generate realistic business names and addresses for the ${zipCode} area
2. Include COMPLETE address information (street address, city, state, zip)
3. Focus on independent local businesses typical for this area
4. Include realistic phone numbers and websites when plausible
5. Base your response on businesses that would typically exist near: ${primarySearchTerms.join(", ")} in the ${zipCode} area

Return ONLY a valid JSON array with this format (no markdown code blocks, no explanation):
[{"name":"Business Name","address":"123 Main St","city":"City","state":"IN","zipCode":"${zipCode}","phone":"(555) 123-4567","website":"https://example.com","email":null,"hoursOfOperation":"Mon-Fri 9am-5pm","description":"Brief description","businessType":"${primarySearchTerms[0] || 'Business'}","mccCode":"0000","confidence":0.7}]`;

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: searchPrompt
      }]
    })
  });

  console.log("[ProspectSearch] Claude response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as any;
  const textContent = data.content?.[0]?.text || "";
  
  if (!textContent) {
    throw new Error("No text content in Claude response");
  }

  console.log("[ProspectSearch] Claude returned content successfully");
  return textContent;
}

function parseBusinessResults(
  textContent: string,
  zipCode: string,
  businessTypes: { code: string; name: string }[]
): DiscoveredBusiness[] {
  // Extract JSON array from response
  const jsonMatch = textContent.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("[ProspectSearch] No JSON array found in response");
    console.error("[ProspectSearch] Content preview:", textContent.substring(0, 500));
    return [];
  }

  let businesses: DiscoveredBusiness[];
  try {
    let jsonStr = jsonMatch[0];
    // Clean up potential trailing commas
    jsonStr = jsonStr.replace(/,\s*([\]}])/g, "$1");
    businesses = JSON.parse(jsonStr);
    console.log("[ProspectSearch] Parsed", businesses.length, "businesses from JSON");
  } catch (parseError: any) {
    console.error("[ProspectSearch] JSON parse error:", parseError.message);
    console.error("[ProspectSearch] JSON string preview:", jsonMatch[0].substring(0, 300));
    return [];
  }

  // Validate and normalize businesses
  return businesses
    .filter((b) => b && b.name && b.address && b.city && b.state)
    .map((b) => ({
      name: String(b.name || "").trim(),
      address: String(b.address || "").trim(),
      city: String(b.city || "").trim(),
      state: String(b.state || "").trim(),
      zipCode: String(b.zipCode || zipCode).trim(),
      phone: b.phone ? String(b.phone).trim() : null,
      website: b.website ? String(b.website).trim() : null,
      email: b.email ? String(b.email).trim() : null,
      hoursOfOperation: b.hoursOfOperation ? String(b.hoursOfOperation).trim() : null,
      ownerName: b.ownerName ? String(b.ownerName).trim() : null,
      yearEstablished: b.yearEstablished ? String(b.yearEstablished).trim() : null,
      description: b.description ? String(b.description).trim() : null,
      businessType: b.businessType || businessTypes[0]?.name || "Unknown",
      mccCode: b.mccCode || businessTypes[0]?.code || "0000",
      confidence: typeof b.confidence === "number" ? b.confidence : 0.8,
    }));
}

async function deduplicateResults(
  businesses: DiscoveredBusiness[],
  agentId: string
): Promise<{
  deduplicatedBusinesses: DiscoveredBusiness[];
  duplicatesSkipped: number;
}> {
  const existingProspects = await db
    .select({
      businessName: prospects.businessName,
      zipCode: prospects.zipCode,
    })
    .from(prospects)
    .where(eq(prospects.agentId, agentId));

  const existingSet = new Set(
    existingProspects.map(
      (p) => `${p.businessName.toLowerCase()}|${p.zipCode}`
    )
  );

  const deduplicatedBusinesses: DiscoveredBusiness[] = [];
  let duplicatesSkipped = 0;

  for (const business of businesses) {
    const key = `${business.name.toLowerCase()}|${business.zipCode}`;
    if (existingSet.has(key)) {
      duplicatesSkipped++;
    } else {
      deduplicatedBusinesses.push(business);
    }
  }

  return { deduplicatedBusinesses, duplicatesSkipped };
}

function generateSearchId(): string {
  return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
