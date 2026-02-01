import OpenAI from "openai";

let openaiAIIntegrations: OpenAI | null = null;

export async function getAIIntegrationsClient(): Promise<OpenAI | null> {
  if (!openaiAIIntegrations) {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    if (!apiKey || !baseURL) {
      console.log("[AI Integrations] Not configured, returning null");
      return null;
    }
    openaiAIIntegrations = new OpenAI({ apiKey, baseURL });
  }
  return openaiAIIntegrations;
}
