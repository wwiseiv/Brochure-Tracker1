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

  const grokApiKey = process.env.GROK_API_KEY;

  console.log("[ProspectSearch] === SEARCH STARTED ===");
  console.log("[ProspectSearch] ZIP:", zipCode);
  console.log("[ProspectSearch] Business types:", businessTypes.map(b => b.name).join(", "));
  console.log("[ProspectSearch] Radius:", radius, "miles");
  console.log("[ProspectSearch] Max results:", maxResults);
  console.log("[ProspectSearch] API key exists:", !!grokApiKey);

  if (!grokApiKey) {
    console.error("[ProspectSearch] !!! NO API KEY !!!");
    throw new Error("Grok API not configured. Please add GROK_API_KEY to Secrets.");
  }

  const businessTypeNames = businessTypes.map((bt) => bt.name).join(", ");
  const primarySearchTerms = businessTypes.slice(0, 5).map(bt => bt.name);

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

Return the results as a JSON array with this exact format:
[
  {
    "name": "Business Name",
    "address": "123 Main Street",
    "city": "City Name",
    "state": "IN",
    "zipCode": "${zipCode}",
    "phone": "(555) 123-4567",
    "website": "https://example.com",
    "email": null,
    "hoursOfOperation": "Mon-Fri 9am-5pm",
    "ownerName": null,
    "yearEstablished": null,
    "description": "Brief description of the business",
    "businessType": "${businessTypes[0]?.name || 'Business'}",
    "mccCode": "${businessTypes[0]?.code || '0000'}",
    "confidence": 0.9
  }
]

IMPORTANT: Return ONLY a valid JSON array. Start with [ and end with ]. No markdown code blocks, no explanation text.`;

  try {
    console.log("[ProspectSearch] Making API request to x.ai Responses API with web_search tool...");
    
    const requestBody = {
      model: "grok-4",
      tools: [{ type: "web_search" }],
      input: searchPrompt
    };
    
    console.log("[ProspectSearch] Using Responses API with grok-4 + web_search");
    
    const response = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${grokApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log("[ProspectSearch] Response status:", response.status);
    console.log("[ProspectSearch] Response ok:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ProspectSearch] !!! API ERROR !!!");
      console.error("[ProspectSearch] Status:", response.status);
      console.error("[ProspectSearch] Error body:", errorText);
      throw new Error(`Grok API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as XAIResponse;
    console.log("[ProspectSearch] Response received successfully");
    console.log("[ProspectSearch] Model used:", data.model);
    
    // Find text content from the output array
    // xAI Responses API returns: output[] with type "message" containing content[].text
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
    
    // Remove citation markup like [[1]](url) that xAI adds
    textContent = textContent.replace(/\[\[\d+\]\]\([^)]+\)/g, "");
    
    console.log("[ProspectSearch] Content length:", textContent.length);

    if (!textContent) {
      console.error("[ProspectSearch] No text content in response");
      console.error("[ProspectSearch] Output types:", data.output?.map(o => o.type).join(", "));
      console.error("[ProspectSearch] Full response preview:", JSON.stringify(data).substring(0, 1000));
      return {
        businesses: [],
        totalFound: 0,
        duplicatesSkipped: 0,
        searchId: generateSearchId(),
      };
    }

    // Extract JSON array from response
    const jsonMatch = textContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("[ProspectSearch] No JSON array found in response");
      console.error("[ProspectSearch] Content preview:", textContent.substring(0, 500));
      return {
        businesses: [],
        totalFound: 0,
        duplicatesSkipped: 0,
        searchId: generateSearchId(),
      };
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
      return {
        businesses: [],
        totalFound: 0,
        duplicatesSkipped: 0,
        searchId: generateSearchId(),
      };
    }

    // Validate and normalize businesses
    businesses = businesses
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
  } catch (error: any) {
    console.error("[ProspectSearch] === SEARCH FAILED ===");
    console.error("[ProspectSearch] Error name:", error.name);
    console.error("[ProspectSearch] Error message:", error.message);
    console.error("[ProspectSearch] Error stack:", error.stack);
    throw error;
  }
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
