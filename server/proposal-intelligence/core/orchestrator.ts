import { v4 as uuidv4 } from "uuid";
import type { ProposalContext, MerchantData, SalespersonInfo, ProposalStage } from "./types";
import pluginManager from "./plugin-manager";

export interface ProposalRequest {
  userId: string;
  organizationId: number;
  merchantData: MerchantData;
  salesperson: SalespersonInfo;
  selectedEquipmentId?: number;
  outputFormat?: "pdf" | "docx" | "html";
}

class ProposalOrchestrator {
  async createContext(request: ProposalRequest): Promise<ProposalContext> {
    return {
      id: uuidv4(),
      userId: request.userId,
      organizationId: request.organizationId,
      merchantData: request.merchantData,
      enrichedData: {},
      pricingData: {},
      salesperson: request.salesperson,
      outputFormat: request.outputFormat || "pdf",
      stage: "init",
      audit: [{
        timestamp: new Date(),
        stage: "init",
        plugin: "orchestrator",
        action: "Context created",
        success: true,
        metadata: { requestId: request.userId }
      }],
      citations: [],
      errors: [],
      warnings: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async execute(request: ProposalRequest): Promise<ProposalContext> {
    let context = await this.createContext(request);
    console.log(`[Orchestrator] Starting proposal generation: ${context.id}`);

    const stages: Array<{ stage: ProposalStage; pluginStage: "validate" | "enrich" | "reason" | "compile" }> = [
      { stage: "validate", pluginStage: "validate" },
      { stage: "enrich", pluginStage: "enrich" },
      { stage: "reason", pluginStage: "reason" },
      { stage: "compile", pluginStage: "compile" }
    ];

    for (const { stage, pluginStage } of stages) {
      context.stage = stage;
      context.updatedAt = new Date();
      
      console.log(`[Orchestrator] Entering stage: ${stage}`);
      
      try {
        context = await pluginManager.runStage(pluginStage, context);
        
        if (context.errors.length > 0 && stage === "validate") {
          console.warn(`[Orchestrator] Validation warnings:`, context.errors);
        }
      } catch (error) {
        context.stage = "error";
        context.errors.push(`Stage ${stage} failed: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`[Orchestrator] Stage ${stage} failed:`, error);
        break;
      }
    }

    if (context.stage !== "error") {
      context.stage = "complete";
    }

    console.log(`[Orchestrator] Proposal ${context.id} completed with stage: ${context.stage}`);
    return context;
  }

  getAuditLog(context: ProposalContext): string {
    return JSON.stringify({
      proposalId: context.id,
      userId: context.userId,
      organizationId: context.organizationId,
      merchantName: context.merchantData.businessName,
      stage: context.stage,
      pluginsRun: context.audit.map(a => a.plugin),
      modelsUsed: Array.from(new Set(context.audit.filter(a => a.model).map(a => a.model))),
      totalDuration: context.audit.reduce((sum, a) => sum + (a.duration || 0), 0),
      errors: context.errors,
      warnings: context.warnings,
      citations: context.citations,
      createdAt: context.createdAt.toISOString(),
      completedAt: context.updatedAt.toISOString()
    }, null, 2);
  }
}

export const orchestrator = new ProposalOrchestrator();
export default orchestrator;
