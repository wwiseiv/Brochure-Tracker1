/**
 * PCB Auto — AI Help with Smart Navigation
 * 
 * Usage:
 *   import { AIHelpChat } from '@/components/ai-help';
 *   
 *   // In your App layout:
 *   <AIHelpChat />
 */

export { AIHelpChat } from './AIHelpChat';
export { useAINavigation } from './useAINavigation';
export { renderAIMessage } from './AIMessageRenderer';
export { 
  NAV_MAP, 
  getNavTarget, 
  findNavTarget, 
  buildNavSystemPrompt,
  type NavTarget 
} from './navMap';
