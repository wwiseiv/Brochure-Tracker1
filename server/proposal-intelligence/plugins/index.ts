import { pluginManager } from "../core/plugin-manager";
import { FieldValidationPlugin } from "./field-validation";
import { WebScraperPlugin } from "./web-scraper";
import { ProposalGeneratorPlugin } from "./proposal-generator";

export function registerAllPlugins(): void {
  console.log("[Plugins] Registering all plugins...");
  
  pluginManager.register(FieldValidationPlugin);
  pluginManager.register(WebScraperPlugin);
  pluginManager.register(ProposalGeneratorPlugin);
  
  console.log(`[Plugins] ${pluginManager.getAllPlugins().length} plugins registered`);
}

export {
  FieldValidationPlugin,
  WebScraperPlugin,
  ProposalGeneratorPlugin
};
