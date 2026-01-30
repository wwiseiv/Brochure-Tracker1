import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function askClaude(prompt: string, context: string = ''): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: context ? `${context}\n\n${prompt}` : prompt
      }
    ]
  });
  
  const textBlock = response.content[0];
  if (textBlock.type === 'text') {
    return textBlock.text;
  }
  return '';
}

export async function debugSignNowError(errorResponse: any, requestBody: any): Promise<string> {
  const prompt = `I'm getting this error from SignNow API:

Error Response: ${JSON.stringify(errorResponse, null, 2)}

My Request Body: ${JSON.stringify(requestBody, null, 2)}

What's wrong and how do I fix it?`;

  return askClaude(prompt);
}
