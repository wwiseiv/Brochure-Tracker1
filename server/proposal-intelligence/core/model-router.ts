import Anthropic from "@anthropic-ai/sdk";
import type { ModelProvider, ModelConfig, ModelResponse } from "./types";

interface ModelTask {
  type: "analysis" | "writing" | "math" | "compliance" | "extraction" | "general";
  prompt: string;
  systemPrompt?: string;
  context?: string;
}

class ModelRouter {
  private anthropic: Anthropic | null = null;
  private geminiBaseUrl: string | null = null;
  private geminiApiKey: string | null = null;
  private openaiBaseUrl: string | null = null;
  private openaiApiKey: string | null = null;

  constructor() {
    this.initializeClients();
  }

  private initializeClients() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    if (process.env.AI_INTEGRATIONS_GEMINI_API_KEY) {
      this.geminiApiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
      this.geminiBaseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
    }

    if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
      this.openaiApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      this.openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com";
    }
  }

  selectModel(task: ModelTask["type"]): ModelConfig {
    switch (task) {
      case "math":
      case "extraction":
        return { provider: "gemini", model: "gemini-1.5-flash", temperature: 0.1 };
      case "compliance":
      case "analysis":
        return { provider: "claude", model: "claude-sonnet-4-20250514", temperature: 0.3 };
      case "writing":
        return { provider: "claude", model: "claude-sonnet-4-20250514", temperature: 0.7 };
      default:
        if (this.anthropic) {
          return { provider: "claude", model: "claude-sonnet-4-20250514", temperature: 0.5 };
        } else if (this.geminiApiKey) {
          return { provider: "gemini", model: "gemini-1.5-flash", temperature: 0.5 };
        } else {
          return { provider: "openai", model: "gpt-4o-mini", temperature: 0.5 };
        }
    }
  }

  async route(task: ModelTask, preferredProvider?: ModelProvider): Promise<ModelResponse> {
    const config = preferredProvider 
      ? { provider: preferredProvider, model: this.getDefaultModel(preferredProvider), temperature: 0.5 }
      : this.selectModel(task.type);

    const startTime = Date.now();

    try {
      let content: string;

      switch (config.provider) {
        case "claude":
          content = await this.callClaude(task, config);
          break;
        case "gemini":
          content = await this.callGemini(task, config);
          break;
        case "openai":
          content = await this.callOpenAI(task, config);
          break;
        default:
          throw new Error(`Unknown provider: ${config.provider}`);
      }

      return {
        content,
        model: config.model,
        provider: config.provider,
        latencyMs: Date.now() - startTime
      };
    } catch (error) {
      console.error(`[ModelRouter] ${config.provider} failed, trying fallback...`);
      return this.tryFallback(task, config.provider, startTime);
    }
  }

  private getDefaultModel(provider: ModelProvider): string {
    switch (provider) {
      case "claude": return "claude-sonnet-4-20250514";
      case "gemini": return "gemini-1.5-flash";
      case "openai": return "gpt-4o-mini";
    }
  }

  private async callClaude(task: ModelTask, config: ModelConfig): Promise<string> {
    if (!this.anthropic) {
      throw new Error("Claude not configured");
    }

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: task.context ? `${task.context}\n\n${task.prompt}` : task.prompt }
    ];

    const response = await this.anthropic.messages.create({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      system: task.systemPrompt,
      messages
    });

    const textBlock = response.content[0];
    if (textBlock.type === "text") {
      return textBlock.text;
    }
    return "";
  }

  private async callGemini(task: ModelTask, config: ModelConfig): Promise<string> {
    if (!this.geminiApiKey || !this.geminiBaseUrl) {
      throw new Error("Gemini not configured");
    }

    const fullPrompt = task.systemPrompt 
      ? `${task.systemPrompt}\n\n${task.context || ""}\n\n${task.prompt}`
      : `${task.context || ""}\n\n${task.prompt}`;

    const response = await fetch(`${this.geminiBaseUrl}/v1beta/models/${config.model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.geminiApiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: config.temperature || 0.5,
          maxOutputTokens: config.maxTokens || 4096
        }
      })
    });

    const data = await response.json() as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  private async callOpenAI(task: ModelTask, config: ModelConfig): Promise<string> {
    if (!this.openaiApiKey || !this.openaiBaseUrl) {
      throw new Error("OpenAI not configured");
    }

    const messages: any[] = [];
    if (task.systemPrompt) {
      messages.push({ role: "system", content: task.systemPrompt });
    }
    messages.push({ 
      role: "user", 
      content: task.context ? `${task.context}\n\n${task.prompt}` : task.prompt 
    });

    const response = await fetch(`${this.openaiBaseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.openaiApiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature || 0.5,
        max_tokens: config.maxTokens || 4096
      })
    });

    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content || "";
  }

  private async tryFallback(
    task: ModelTask, 
    failedProvider: ModelProvider, 
    startTime: number
  ): Promise<ModelResponse> {
    const fallbackOrder: ModelProvider[] = ["claude", "gemini", "openai"];
    
    for (const provider of fallbackOrder) {
      if (provider === failedProvider) continue;
      
      try {
        const config = { 
          provider, 
          model: this.getDefaultModel(provider), 
          temperature: 0.5 
        };
        
        let content: string;
        switch (provider) {
          case "claude":
            if (!this.anthropic) continue;
            content = await this.callClaude(task, config);
            break;
          case "gemini":
            if (!this.geminiApiKey) continue;
            content = await this.callGemini(task, config);
            break;
          case "openai":
            if (!this.openaiApiKey) continue;
            content = await this.callOpenAI(task, config);
            break;
          default:
            continue;
        }

        return {
          content,
          model: config.model,
          provider,
          latencyMs: Date.now() - startTime
        };
      } catch {
        continue;
      }
    }

    throw new Error("All model providers failed");
  }

  getAvailableProviders(): ModelProvider[] {
    const providers: ModelProvider[] = [];
    if (this.anthropic) providers.push("claude");
    if (this.geminiApiKey) providers.push("gemini");
    if (this.openaiApiKey) providers.push("openai");
    return providers;
  }
}

export const modelRouter = new ModelRouter();
export default modelRouter;
