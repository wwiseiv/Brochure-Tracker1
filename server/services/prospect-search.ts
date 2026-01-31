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

export async function searchLocalBusinesses(
  params: ProspectSearchParams
): Promise<SearchResult> {
  const { zipCode, businessTypes, radius, maxResults, agentId } = params;

  const grokApiKey = process.env.GROK_API_KEY;

  console.log("[ProspectSearch] === SEARCH STARTED ===");
  console.log("[ProspectSearch] ZIP:", zipCode);
  console.log("[ProspectSearch] Business types:", businessTypes.map(b => b.name).join(", "));
  console.log("[ProspectSearch] API key exists:", !!grokApiKey);
  console.log("[ProspectSearch] API key prefix:", grokApiKey?.substring(0, 8) + "...");

  if (!grokApiKey) {
    console.error("[ProspectSearch] !!! NO API KEY !!!");
    throw new Error("Grok API not configured. Please add GROK_API_KEY to Secrets.");
  }

  const businessTypeNames = businessTypes.map((bt) => bt.name).join(", ");
  const allSearchTerms = businessTypes.flatMap((bt) => [
    bt.name,
    ...bt.searchTerms,
  ]);

  const searchPrompt = `Search the web to find real, currently operating local businesses matching these criteria:

SEARCH PARAMETERS:
- Location: Within ${radius} miles of ZIP code ${zipCode}
- Business Types: ${businessTypeNames}
- Search Terms: ${allSearchTerms.slice(0, 10).join(", ")}
- Number of Results Needed: ${maxResults}

REQUIREMENTS:
1. Find REAL businesses that currently exist and are operating
2. Include COMPLETE address information (street address, city, state, zip)
3. Prioritize independent local businesses over national chains
4. Include phone numbers, websites, and hours when available

Return the results as a JSON array with this exact format:
[
  {
    "name": "Business Name",
    "address": "123 Main Street",
    "city": "City Name",
    "state": "IN",
    "zipCode": "46032",
    "phone": "(555) 123-4567",
    "website": "https://example.com",
    "email": null,
    "hoursOfOperation": "Mon-Fri 9am-5pm",
    "ownerName": null,
    "yearEstablished": null,
    "description": "Brief description",
    "businessType": "${businessTypes[0]?.name || 'Business'}",
    "mccCode": "${businessTypes[0]?.code || '0000'}",
    "confidence": 0.9
  }
]

Return ONLY a valid JSON array. Start with [ and end with ]. No markdown, no explanation.`;

  try {
    console.log("[ProspectSearch] Making API request to x.ai...");
    
    const requestBody = {
      model: "grok-4",
      messages: [
        {
          role: "system",
          content: "You are a business research assistant with real-time web search capability. Search the web to find real local business information. Always return results as valid JSON arrays."
        },
        {
          role: "user",
          content: searchPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4096
    };
    
    console.log("[ProspectSearch] Request model:", requestBody.model);
    
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
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

    const data = await response.json() as any;
    console.log("[ProspectSearch] Response received successfully");
    
    const textContent = data.choices?.[0]?.message?.content || "";
    console.log("[ProspectSearch] Content length:", textContent.length);

    if (!textContent) {
      console.error("[ProspectSearch] No content in response");
      console.error("[ProspectSearch] Full response:", JSON.stringify(data).substring(0, 500));
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
      .filter((b) => b.name && b.address && b.city && b.state)
      .map((b) => ({
        name: b.name,
        address: b.address,
        city: b.city,
        state: b.state,
        zipCode: b.zipCode || zipCode,
        phone: b.phone || null,
        website: b.website || null,
        email: b.email || null,
        hoursOfOperation: b.hoursOfOperation || null,
        ownerName: b.ownerName || null,
        yearEstablished: b.yearEstablished || null,
        description: b.description || null,
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
