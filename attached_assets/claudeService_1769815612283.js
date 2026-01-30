// Claude AI Analysis Service
// Uses Claude API for enhanced statement analysis and insights

/**
 * Get AI-powered analysis from Claude
 */
export async function getAIAnalysis(statementData, calculatedAnalysis) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.warn('No Anthropic API key configured');
    return null;
  }

  const prompt = buildAnalysisPrompt(statementData, calculatedAnalysis);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('AI analysis failed:', error);
    return null;
  }
}

/**
 * Build the analysis prompt for Claude
 */
function buildAnalysisPrompt(statementData, analysis) {
  return `You are an expert merchant services consultant helping a PCBancard sales agent analyze a merchant's processing statement.

## STATEMENT DATA
- Monthly Volume: $${statementData.volume.toLocaleString()}
- Monthly Transactions: ${statementData.transactions.toLocaleString()}
- Average Ticket: $${(statementData.volume / statementData.transactions).toFixed(2)}
- Total Monthly Fees: $${statementData.totalFees.toLocaleString()}
- Current Effective Rate: ${((statementData.totalFees / statementData.volume) * 100).toFixed(2)}%
- Merchant Type: ${statementData.merchantType || 'retail'}
- Current Processor: ${statementData.currentProcessor || 'Unknown'}

## CALCULATED ANALYSIS
${JSON.stringify(analysis, null, 2)}

## YOUR TASK

Provide actionable insights for the sales agent:

### 1. KEY OBSERVATIONS
What stands out about this merchant's processing costs? Identify 3-5 specific findings.

### 2. SAVINGS STORY
Write a compelling 2-3 sentence summary of the savings opportunity that the agent can use to open the conversation.

### 3. LIKELY OBJECTIONS
Based on this merchant's profile, what objections are they most likely to raise? How should the agent handle each one?

### 4. CUSTOMIZED QUESTIONS
What specific questions should the agent ask THIS merchant to uncover more pain points?

### 5. CLOSING STRATEGY
What's the best approach to close this deal? What should the agent emphasize based on the numbers?

### 6. RED FLAGS FOR THE AGENT
Is there anything unusual about this statement that the agent should investigate further or be cautious about?

Keep your response practical and focused on helping the agent win this deal. Use specific numbers from the analysis.`;
}

/**
 * Get AI-generated competitive intelligence
 */
export async function getCompetitorIntel(processorName) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  
  if (!apiKey || !processorName || processorName === 'Unknown') {
    return null;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are a merchant services industry expert. Provide competitive intelligence about "${processorName}" for a sales agent trying to win a merchant away from them.

Include:
1. Known issues or complaints about this processor
2. Their typical contract terms and gotchas
3. Common fee structures they use
4. Best talking points to use against them
5. What merchants typically dislike about them

Be specific and actionable. Keep response under 400 words.`
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Competitor intel failed:', error);
    return null;
  }
}

/**
 * Generate a custom negotiation script based on specific scenario
 */
export async function generateCustomScript(scenario, analysisData) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a sales coach for merchant services. Generate a specific script for this scenario:

Scenario: ${scenario}

Merchant Data:
- Monthly Volume: $${analysisData.input?.volume?.toLocaleString() || 'N/A'}
- Current Rate: ${analysisData.current?.effectiveRate?.toFixed(2) || 'N/A'}%
- Monthly Savings Opportunity: $${analysisData.summary?.maxMonthlySavings?.toFixed(0) || 'N/A'}

Write a natural, conversational script (not bullet points) that the agent can use. Include specific numbers from the data. Keep it under 200 words.`
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Script generation failed:', error);
    return null;
  }
}
