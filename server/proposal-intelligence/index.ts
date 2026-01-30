export * from "./core";
export * from "./plugins";
import { registerAllPlugins } from "./plugins";

let initialized = false;

export function initializeProposalIntelligence(): void {
  if (initialized) return;
  
  console.log("[ProposalIntelligence] Initializing platform...");
  registerAllPlugins();
  initialized = true;
  console.log("[ProposalIntelligence] Platform ready");
}

export { orchestrator } from "./core/orchestrator";
export { modelRouter } from "./core/model-router";
export { pluginManager } from "./core/plugin-manager";
