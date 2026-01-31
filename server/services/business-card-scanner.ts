import Anthropic from "@anthropic-ai/sdk";

interface ExtractedBusinessCardData {
  businessName?: string;
  contactName?: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  businessType?: string;
  confidence: number;
  extractionNotes: string[];
}

const BUSINESS_CARD_PROMPT = `You are analyzing a business card image. Extract all contact and business information visible on the card.

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "businessName": "Company or business name",
  "contactName": "Person's full name on the card",
  "title": "Job title or position",
  "phone": "Primary phone number (formatted as digits with dashes like 555-123-4567)",
  "email": "Email address",
  "website": "Website URL (without http/https prefix if shown without it)",
  "addressLine1": "Street address",
  "city": "City name",
  "state": "State abbreviation (2 letters, e.g., CA, TX, NY)",
  "zipCode": "ZIP code",
  "businessType": "Inferred business type (restaurant, retail, medical, salon, auto, service, or other)",
  "confidence": 85,
  "extractionNotes": ["Any notes about unclear text or missing info"]
}

EXTRACTION RULES:
1. If text is unclear or partially visible, make your best guess and note it in extractionNotes
2. For phone numbers, extract the primary/main number, preferring mobile if both are listed
3. For state, always use 2-letter abbreviation (convert "California" to "CA", etc.)
4. If no business name is visible, use the person's name as the business name
5. Infer business type from any context clues (industry, services mentioned, logos)
6. Confidence should be 0-100 based on image clarity and completeness of extraction
7. If a field is not visible or extractable, omit it from the response (don't include null values)`;

export async function extractBusinessCardData(
  base64ImageData: string,
  mimeType: string
): Promise<ExtractedBusinessCardData> {
  const anthropicApiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  const anthropicBaseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;

  if (!anthropicApiKey || !anthropicBaseUrl) {
    throw new Error("Claude API not configured for business card scanning");
  }

  const anthropic = new Anthropic({
    apiKey: anthropicApiKey,
    baseURL: anthropicBaseUrl,
  });

  const mediaType = mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  console.log("[BusinessCardScanner] Processing image, size:", base64ImageData.length);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64ImageData,
              },
            },
            {
              type: "text",
              text: BUSINESS_CARD_PROMPT,
            },
          ],
        },
      ],
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    console.log("[BusinessCardScanner] Claude response:", responseText.substring(0, 200));

    return parseExtractedData(responseText);
  } catch (error: any) {
    console.error("[BusinessCardScanner] Claude analysis error:", error?.message || error);
    throw new Error(`Business card analysis failed: ${error?.message || "Unknown error"}`);
  }
}

function parseExtractedData(responseText: string): ExtractedBusinessCardData {
  try {
    let cleanedText = responseText.trim();
    
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.slice(7);
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    const data = JSON.parse(cleanedText);

    return {
      businessName: data.businessName || undefined,
      contactName: data.contactName || undefined,
      title: data.title || undefined,
      phone: data.phone || undefined,
      email: data.email || undefined,
      website: data.website || undefined,
      addressLine1: data.addressLine1 || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      zipCode: data.zipCode || undefined,
      businessType: data.businessType || undefined,
      confidence: typeof data.confidence === "number" ? data.confidence : 50,
      extractionNotes: Array.isArray(data.extractionNotes) ? data.extractionNotes : [],
    };
  } catch (error: any) {
    console.error("[BusinessCardScanner] Failed to parse response:", error?.message);
    return {
      confidence: 0,
      extractionNotes: ["Failed to parse AI response. Please try again with a clearer image."],
    };
  }
}
