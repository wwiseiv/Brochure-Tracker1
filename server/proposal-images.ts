import { GoogleGenAI } from "@google/genai";

export interface ProposalImages {
  heroBanner?: string;
  comparisonBackground?: string;
  trustVisual?: string;
  generationStatus: "complete" | "partial" | "failed";
  errors?: string[];
}

interface ImageGenerationResult {
  success: boolean;
  base64?: string;
  error?: string;
}

async function generateSingleImage(
  ai: GoogleGenAI,
  prompt: string,
  timeoutMs: number = 30000
): Promise<ImageGenerationResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        responseModalities: ["image", "text"],
      },
    });

    clearTimeout(timeoutId);

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          return {
            success: true,
            base64: `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`,
          };
        }
      }
    }

    return {
      success: false,
      error: "No image data in response",
    };
  } catch (error: any) {
    if (error.name === "AbortError") {
      return {
        success: false,
        error: "Image generation timed out",
      };
    }
    return {
      success: false,
      error: error.message || "Unknown error",
    };
  }
}

export async function generateProposalImages(
  industryType: string,
  businessName?: string
): Promise<ProposalImages> {
  const errors: string[] = [];
  const result: ProposalImages = {
    generationStatus: "failed",
    errors: [],
  };

  const geminiApiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  const geminiBaseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;

  if (!geminiApiKey || !geminiBaseUrl) {
    console.log("[ProposalImages] Gemini AI not configured, skipping image generation");
    return {
      generationStatus: "failed",
      errors: ["Gemini AI integration not configured"],
    };
  }

  const ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      apiVersion: "",
      baseUrl: geminiBaseUrl,
    },
  });

  const industryLabel = industryType || "business";
  const businessContext = businessName ? ` for ${businessName}` : "";

  const prompts = {
    heroBanner: `Professional, clean hero banner image for a payment processing proposal for a ${industryLabel} business${businessContext}. Modern corporate style, subtle blue and green gradients, no text, abstract shapes, 16:9 aspect ratio`,
    comparisonBackground: `Minimalist abstract background for a pricing comparison section. Clean lines, subtle gradients in blue and green, professional, no text`,
    trustVisual: `Professional handshake in small business setting, warm lighting, clean background, business partnership concept, no faces visible`,
  };

  const imagePromises = [
    generateSingleImage(ai, prompts.heroBanner).then((r) => ({ key: "heroBanner", result: r })),
    generateSingleImage(ai, prompts.comparisonBackground).then((r) => ({ key: "comparisonBackground", result: r })),
    generateSingleImage(ai, prompts.trustVisual).then((r) => ({ key: "trustVisual", result: r })),
  ];

  try {
    const results = await Promise.all(imagePromises);

    let successCount = 0;

    for (const { key, result: imgResult } of results) {
      if (imgResult.success && imgResult.base64) {
        (result as any)[key] = imgResult.base64;
        successCount++;
      } else {
        errors.push(`${key}: ${imgResult.error}`);
      }
    }

    if (successCount === 3) {
      result.generationStatus = "complete";
    } else if (successCount > 0) {
      result.generationStatus = "partial";
    } else {
      result.generationStatus = "failed";
    }

    result.errors = errors.length > 0 ? errors : undefined;

    console.log(`[ProposalImages] Generated ${successCount}/3 images for ${industryLabel}`);
  } catch (error: any) {
    console.error("[ProposalImages] Error generating images:", error.message);
    result.generationStatus = "failed";
    result.errors = [error.message || "Unknown error during image generation"];
  }

  return result;
}
