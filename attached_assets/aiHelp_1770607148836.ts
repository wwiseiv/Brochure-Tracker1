/**
 * PCB Auto — AI Help API Route
 * 
 * Express route handler that calls Claude with the navigation-aware
 * system prompt. Injects shop context and nav map so Claude can
 * provide contextual answers with tappable navigation links.
 * 
 * Add to your Express app:
 *   import { aiHelpRouter } from './routes/aiHelp';
 *   app.use('/api/ai-help', aiHelpRouter);
 */

import { Router, type Request, type Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { buildNavSystemPrompt } from '../shared/navMap';

const router = Router();

// Initialize Anthropic client (uses ANTHROPIC_API_KEY env var)
const anthropic = new Anthropic();

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIHelpRequest {
  message: string;
  history?: ChatMessage[];
  shopContext?: {
    revenue?: number;
    carsInShop?: number;
    aro?: number;
    approvalRate?: number;
    feesSaved?: number;
    activeWorkOrders?: number;
    pendingEstimates?: number;
  };
}

/**
 * Build the system prompt with shop context and navigation links
 */
function buildSystemPrompt(shopContext?: AIHelpRequest['shopContext']): string {
  const navSection = buildNavSystemPrompt();

  const contextSection = shopContext
    ? `
## Current Shop Data
Use this real-time data when the user asks about their shop:
- Today's Revenue: $${shopContext.revenue?.toLocaleString() ?? 'N/A'}
- Cars In Shop: ${shopContext.carsInShop ?? 'N/A'}
- Average Repair Order: $${shopContext.aro?.toLocaleString() ?? 'N/A'}
- Approval Rate: ${shopContext.approvalRate ?? 'N/A'}%
- Fees Saved (this month): $${shopContext.feesSaved?.toLocaleString() ?? 'N/A'}
- Active Work Orders: ${shopContext.activeWorkOrders ?? 'N/A'}
- Pending Estimates: ${shopContext.pendingEstimates ?? 'N/A'}
`
    : '';

  return `You are the AI Help Assistant for PCB Auto, an auto repair shop management platform.

## Your Role
- Answer questions about platform features, terminology, and navigation
- Explain metrics, reports, and business concepts in plain language
- Help users find things in the app by embedding navigation links
- Provide shop performance insights using real-time data when available
- Be concise, friendly, and action-oriented

## Tone & Style
- Speak like a knowledgeable colleague, not a manual
- Lead with the answer, then explain
- Use short paragraphs (2-3 sentences max)
- Bold key terms with **double asterisks**
- Use bullet points (•) for lists
- Include emoji sparingly for visual scanning

${navSection}

${contextSection}

## Key Platform Concepts

**Dual Pricing / Cash Discount**: Shows customers two prices — Cash Price (base) and 
Card Price (base + ~3.5% surcharge). Customers who pay card cover processing fees. 
The shop's [[nav:fees-saved]] card tracks total savings.

**DVI (Digital Vehicle Inspection)**: Technicians photograph and document findings 
during inspections. Photos are sent to customers with [[nav:estimates]] to build trust 
and increase [[nav:approval-rate]].

**ARO (Average Repair Order)**: The average dollar amount per completed work order.
A key profitability metric visible on the [[nav:aro]] dashboard card.

**Fees Saved**: Running total of credit card processing fees the shop avoided 
through dual pricing. Tracked on [[nav:fees-saved]].

## Important
- ALWAYS include at least one [[nav:key]] link when discussing a feature or section
- For "where is X" questions, put the nav link FIRST in your response
- For "what is X" questions, explain briefly then link
- Never say "go to the menu" or "click on" — use nav links instead
- If you're unsure which section to link, suggest the closest match
`.trim();
}

/**
 * POST /api/ai-help/chat
 * 
 * Send a message to the AI help assistant.
 * Returns the assistant's response with [[nav:key]] tokens
 * that the frontend renders as tappable links.
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, history = [], shopContext } = req.body as AIHelpRequest;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build conversation history for Claude
    const messages: Anthropic.MessageParam[] = [
      ...history.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: buildSystemPrompt(shopContext),
      messages,
    });

    // Extract text content
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return res.json({
      response: text,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('[AI Help] Error:', error);
    return res.status(500).json({
      error: 'Failed to get AI response',
      response:
        "I'm having trouble connecting right now. Try asking again in a moment, or check the section directly using the navigation menu.",
    });
  }
});

/**
 * GET /api/ai-help/suggestions
 * 
 * Returns contextual quick-prompt suggestions based on current page.
 */
router.get('/suggestions', (req: Request, res: Response) => {
  const { page } = req.query;

  const baseSuggestions = [
    { text: 'How is my shop doing?', icon: '📈' },
    { text: 'What is fees saved?', icon: '💰' },
    { text: 'Where are my work orders?', icon: '🔧' },
    { text: 'Show me reports', icon: '📊' },
  ];

  // Add page-contextual suggestions
  const contextSuggestions: Record<string, Array<{ text: string; icon: string }>> = {
    '/dashboard': [
      { text: 'Explain my approval rate', icon: '✅' },
      { text: 'What is ARO?', icon: '📊' },
      { text: 'How does dual pricing work?', icon: '💳' },
    ],
    '/work-orders': [
      { text: 'How do I create a work order?', icon: '🔧' },
      { text: 'How do I assign a tech?', icon: '👤' },
      { text: 'Where are estimates?', icon: '📋' },
    ],
    '/estimates': [
      { text: 'How do customers approve?', icon: '✅' },
      { text: 'What is digital approval?', icon: '📱' },
      { text: 'How do I send an estimate?', icon: '📤' },
    ],
    '/reports': [
      { text: 'What reports are available?', icon: '📊' },
      { text: 'Explain cash vs card report', icon: '💳' },
      { text: 'Show tech productivity', icon: '🔧' },
    ],
    '/inspections': [
      { text: 'How do DVIs work?', icon: '🔍' },
      { text: 'How to send photos to customer?', icon: '📸' },
      { text: 'What improves approval rates?', icon: '✅' },
    ],
  };

  const pageSuggestions = contextSuggestions[page as string] || [];

  return res.json({
    suggestions: [...pageSuggestions, ...baseSuggestions].slice(0, 6),
  });
});

export { router as aiHelpRouter };
