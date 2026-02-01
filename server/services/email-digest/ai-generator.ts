import Anthropic from "@anthropic-ai/sdk";
import type { DigestData } from "./data-gatherer";
import { format } from "date-fns";

const anthropic = new Anthropic();

export interface GeneratedDigest {
  subject: string;
  greeting: string;
  sections: Array<{
    title: string;
    content: string;
    items?: Array<{ text: string; link?: string }>;
  }>;
  aiTip: string | null;
  closing: string;
}

export async function generateDigestContent(
  data: DigestData,
  userName: string,
  digestType: 'daily' | 'weekly',
  includeAiTips: boolean
): Promise<GeneratedDigest> {
  const dateStr = format(new Date(), 'EEEE, MMMM d, yyyy');
  
  const contextParts: string[] = [];
  
  if (data.appointments.length > 0) {
    contextParts.push(`APPOINTMENTS TODAY (${data.appointments.length}): ${data.appointments.map(a => `${a.businessName} at ${format(a.appointmentDate, 'h:mm a')}`).join(', ')}`);
  }
  
  if (data.followups.length > 0) {
    contextParts.push(`FOLLOW-UPS DUE (${data.followups.length}): ${data.followups.map(f => f.businessName).join(', ')}`);
  }
  
  if (data.staleDeals.length > 0) {
    contextParts.push(`STALE DEALS (${data.staleDeals.length}): ${data.staleDeals.slice(0, 3).map(s => `${s.businessName} (${s.daysSinceActivity} days)`).join(', ')}`);
  }
  
  if (data.recentWins.length > 0) {
    contextParts.push(`RECENT WINS (${data.recentWins.length}): ${data.recentWins.map(w => `${w.businessName}${w.estimatedValue ? ` ($${w.estimatedValue})` : ''}`).join(', ')}`);
  }
  
  if (data.pipelineSummary.totalDeals > 0) {
    contextParts.push(`PIPELINE: ${data.pipelineSummary.totalDeals} deals, $${data.pipelineSummary.totalValue.toLocaleString()} total value`);
  }

  const prompt = `You are writing a ${digestType} email digest for a field sales representative named ${userName}. Today is ${dateStr}.

SALES DATA:
${contextParts.join('\n')}

Generate a personalized, motivating email digest. The tone should be professional but warm and encouraging. Keep it concise and action-oriented.

${includeAiTips ? 'Include one actionable sales tip relevant to their current pipeline.' : 'Do not include sales tips.'}

Respond in this exact JSON format:
{
  "subject": "Your ${digestType} sales briefing - [brief highlight]",
  "greeting": "Good morning, ${userName}!",
  "sections": [
    {
      "title": "Section Title",
      "content": "Brief summary paragraph",
      "items": [{"text": "Item detail", "link": "/deals/123"}]
    }
  ],
  "aiTip": ${includeAiTips ? '"One actionable tip..."' : 'null'},
  "closing": "Motivating closing statement"
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed as GeneratedDigest;
    }
    
    return generateFallbackDigest(data, userName, digestType);
  } catch (error) {
    console.error('AI digest generation failed:', error);
    return generateFallbackDigest(data, userName, digestType);
  }
}

function generateFallbackDigest(
  data: DigestData,
  userName: string,
  digestType: 'daily' | 'weekly'
): GeneratedDigest {
  const sections: GeneratedDigest['sections'] = [];
  
  if (data.appointments.length > 0) {
    sections.push({
      title: "Today's Appointments",
      content: `You have ${data.appointments.length} appointment${data.appointments.length > 1 ? 's' : ''} scheduled.`,
      items: data.appointments.map(a => ({
        text: `${a.businessName} - ${format(a.appointmentDate, 'h:mm a')}`,
        link: `/deals/${a.id}`
      }))
    });
  }
  
  if (data.followups.length > 0) {
    sections.push({
      title: "Follow-Ups Due",
      content: `${data.followups.length} follow-up${data.followups.length > 1 ? 's' : ''} need your attention.`,
      items: data.followups.map(f => ({
        text: `${f.businessName} - Follow-up #${f.followUpNumber + 1}`,
        link: `/deals/${f.id}`
      }))
    });
  }
  
  if (data.staleDeals.length > 0) {
    sections.push({
      title: "Deals Need Attention",
      content: `${data.staleDeals.length} deal${data.staleDeals.length > 1 ? 's' : ''} haven't been updated recently.`,
      items: data.staleDeals.slice(0, 5).map(s => ({
        text: `${s.businessName} - ${s.daysSinceActivity} days since last activity`,
        link: `/deals/${s.id}`
      }))
    });
  }
  
  if (data.recentWins.length > 0) {
    sections.push({
      title: "Recent Wins",
      content: `Congratulations on ${data.recentWins.length} closed deal${data.recentWins.length > 1 ? 's' : ''}!`,
      items: data.recentWins.map(w => ({
        text: `${w.businessName}${w.estimatedValue ? ` - $${w.estimatedValue}` : ''}`,
        link: `/deals/${w.id}`
      }))
    });
  }
  
  if (data.pipelineSummary.totalDeals > 0) {
    sections.push({
      title: "Pipeline Summary",
      content: `You have ${data.pipelineSummary.totalDeals} active deals worth $${data.pipelineSummary.totalValue.toLocaleString()}.`
    });
  }

  return {
    subject: `Your ${digestType} sales briefing - ${format(new Date(), 'MMM d')}`,
    greeting: `Good morning, ${userName}!`,
    sections,
    aiTip: null,
    closing: "Have a productive day!"
  };
}
