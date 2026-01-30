import type { ProposalContext, ProposalStage, AuditEntry } from "./types";

export interface ProposalPlugin {
  id: string;
  name: string;
  version: string;
  stage: "validate" | "enrich" | "reason" | "compile";
  enabled: boolean;
  priority: number;
  run(context: ProposalContext): Promise<ProposalContext>;
}

class PluginManager {
  private plugins: Map<string, ProposalPlugin> = new Map();
  private featureFlags: Map<string, boolean> = new Map();

  register(plugin: ProposalPlugin): void {
    this.plugins.set(plugin.id, plugin);
    this.featureFlags.set(plugin.id, plugin.enabled);
    console.log(`[PluginManager] Registered plugin: ${plugin.id} v${plugin.version}`);
  }

  unregister(pluginId: string): void {
    this.plugins.delete(pluginId);
    this.featureFlags.delete(pluginId);
    console.log(`[PluginManager] Unregistered plugin: ${pluginId}`);
  }

  setEnabled(pluginId: string, enabled: boolean): void {
    if (this.plugins.has(pluginId)) {
      const plugin = this.plugins.get(pluginId)!;
      plugin.enabled = enabled;
      this.featureFlags.set(pluginId, enabled);
    }
  }

  getPluginsByStage(stage: ProposalPlugin["stage"]): ProposalPlugin[] {
    return Array.from(this.plugins.values())
      .filter(p => p.stage === stage && p.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  getAllPlugins(): ProposalPlugin[] {
    return Array.from(this.plugins.values());
  }

  getPlugin(id: string): ProposalPlugin | undefined {
    return this.plugins.get(id);
  }

  isEnabled(pluginId: string): boolean {
    return this.featureFlags.get(pluginId) ?? false;
  }

  async runStage(
    stage: ProposalPlugin["stage"], 
    context: ProposalContext
  ): Promise<ProposalContext> {
    const plugins = this.getPluginsByStage(stage);
    let currentContext = context;

    for (const plugin of plugins) {
      const startTime = Date.now();
      try {
        console.log(`[PluginManager] Running ${plugin.id} (${stage})`);
        currentContext = await plugin.run(currentContext);
        
        const auditEntry: AuditEntry = {
          timestamp: new Date(),
          stage: stage as ProposalStage,
          plugin: plugin.id,
          action: `Executed ${plugin.name}`,
          duration: Date.now() - startTime,
          success: true
        };
        currentContext.audit.push(auditEntry);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[PluginManager] Plugin ${plugin.id} failed:`, errorMessage);
        
        const auditEntry: AuditEntry = {
          timestamp: new Date(),
          stage: stage as ProposalStage,
          plugin: plugin.id,
          action: `Failed: ${plugin.name}`,
          duration: Date.now() - startTime,
          success: false,
          error: errorMessage
        };
        currentContext.audit.push(auditEntry);
        currentContext.errors.push(`${plugin.id}: ${errorMessage}`);
      }
    }

    return currentContext;
  }
}

export const pluginManager = new PluginManager();
export default pluginManager;
