import { getAIIntegrationsClient } from "../ai-integrations";

export interface ProposalImages {
  hero?: string | null;
  savings?: string | null;
  equipment?: string | null;
}

export class ProposalImageGenerator {
  async generateImage(prompt: string, style: string = "professional"): Promise<string | null> {
    try {
      const ai = await getAIIntegrationsClient();
      if (!ai) {
        console.log("[ImageGenerator] AI client not available, skipping image generation");
        return null;
      }

      console.log("[ImageGenerator] Generating image:", prompt.substring(0, 50) + "...");

      const response = await ai.images.generate({
        model: "imagen-3.0-generate-002",
        prompt: `${prompt}. Style: ${style}, high quality, professional, suitable for business documents.`,
        n: 1,
      });

      if (response.data && response.data[0]) {
        const imageData = response.data[0];
        if (imageData.b64_json) {
          return `data:image/png;base64,${imageData.b64_json}`;
        } else if (imageData.url) {
          return imageData.url;
        }
      }

      return null;
    } catch (error) {
      console.error("[ImageGenerator] Image generation failed:", error);
      return null;
    }
  }

  async generateProposalImages(businessInfo: {
    business_name?: string;
    industry_type?: string;
  }): Promise<ProposalImages> {
    const { business_name, industry_type } = businessInfo;
    const images: ProposalImages = {};

    try {
      images.hero = await this.generateImage(
        `Professional hero banner for a payment processing proposal for a ${
          industry_type || "business"
        }. Modern, clean design with subtle technology elements.`,
        "corporate photography"
      );
    } catch (err) {
      console.log("[ImageGenerator] Hero image generation skipped:", err);
    }

    return images;
  }
}

export const proposalImageGenerator = new ProposalImageGenerator();
