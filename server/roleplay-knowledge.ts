import {
  PSYCHOGRAPHIC_TYPES,
  EMOTIONAL_DRIVERS,
  TONAL_TECHNIQUES,
  DIFFICULTY_RULES,
  NEPQ_PRINCIPLES,
  QUICK_REFERENCE,
  generateEnhancedSystemPrompt,
  generateCoachingFeedbackPrompt,
  detectPsychographicType,
  analyzeEmotionalDrivers,
  analyzeTonalUsage,
  type PsychographicType,
  type EmotionalDriver,
  type TonalTechnique,
  type DifficultyRules
} from './coaching-enhancement';

// Re-export everything from coaching-enhancement for backward compatibility
export {
  PSYCHOGRAPHIC_TYPES,
  EMOTIONAL_DRIVERS,
  TONAL_TECHNIQUES,
  DIFFICULTY_RULES,
  NEPQ_PRINCIPLES,
  QUICK_REFERENCE,
  generateEnhancedSystemPrompt,
  generateCoachingFeedbackPrompt,
  detectPsychographicType,
  analyzeEmotionalDrivers,
  analyzeTonalUsage
};

export type { PsychographicType, EmotionalDriver, TonalTechnique, DifficultyRules };

export const SALES_TRAINING_KNOWLEDGE = `
# PCBancard Dual Pricing Sales Training Knowledge Base

## PRODUCT KNOWLEDGE

### What is Dual Pricing?
Dual Pricing is PCBancard's program where merchants display two prices: a cash price and a card price. The system automatically calculates and shows both prices, allowing customers to choose how they want to pay. This eliminates 3-4% in processing fees on BOTH credit AND debit cards (unlike surcharging which only works on credit).

### The Three Ways to Stop Losing Money on Processing:
1. **Interchange Plus** - Pay the true cost the card networks charge plus a small fixed fee. Good for white-glove brands where one clean price matters.
2. **Surcharging** - Add a fee to credit card transactions only. Problem: You CANNOT surcharge debit cards (federal law prohibits it). Debit is 30-40% of transactions, so you still pay those fees.
3. **Dual Pricing** - Display cash and card prices. Customers choose. You keep what you earned on ALL card types.

### Key Stats and Numbers:
- Average processing fee: 3-4% per transaction
- On a $40 ticket: $1.20-$1.60 lost per transaction
- Average annual loss: $10,000-$25,000+ depending on volume
- Customer attrition from dual pricing: About 1 in 100 (not 1 in 20)
- Investment: Up to $1,000 upfront before first transaction

### Mike's Success Story (Use for testimonials):
- Tire shop owner outside Austin
- Was losing $13,440/year in processing fees
- Year 1 savings reinvested:
  - $3,000 in marketing → $7,500 new revenue
  - $2,500 in loyalty program → 33% more repeat visits
  - $2,000 in tech training → $3,600 extra billable work
  - $4,000 in diagnostic tools → faster, more profitable jobs
- By Year 3: Hired 2 techs, opened Saturdays, no longer struggling

## NEPQ QUESTIONING FRAMEWORK

### The 5 Stages of NEPQ:
1. **Connection Stage** - Build rapport, establish trust
2. **Engagement Stage** - Understand their situation, problems, and consequences
3. **Transition Stage** - Bridge to presenting your solution
4. **Presentation Stage** - Show how you help (without "presenting")
5. **Commitment Stage** - Help them decide

### Connection Questions:
- "What was it about [ad/referral] that attracted your attention?"
- "Was there anything else that caught your interest?"
- "Do you know what you're looking for?"
- "Have you found what you're looking for, or are you still exploring?"

### Situation Questions:
- "Tell me, how are you currently processing card payments?"
- "How long have you been with your current processor?"
- "What do you like about your current setup?"
- "What don't you like about it?"
- "How do you feel about what you're paying in fees?"

### Problem Awareness Questions:
- "What challenges are you facing with your current processing?"
- "When you look at your statement, do you actually know what you're paying?"
- "Have you ever calculated how much is walking out the door each month?"
- "What has that done to your ability to grow?"

### Solution Awareness Questions:
- "Have you looked at any alternatives?"
- "What's prevented you from making a change until now?"
- "If you could eliminate those fees entirely, what would you do with that money?"

### Consequence Questions:
- "What happens if nothing changes?"
- "How will this affect your business a year from now? Five years?"
- "What does it cost you to stay where you are?"

### Commitment Questions:
- "Based on everything we've discussed, where do you see yourself going from here?"
- "What would need to happen for you to feel comfortable moving forward?"
- "Is there anything else you'd need to know before making a decision?"

## OBJECTION HANDLING (3-Step Formula: CLARIFY → DISCUSS → DIFFUSE)

### "I'm not interested"
**Clarify:** "When you say you're not interested, what do you mean by that?"
**Discuss:** Acknowledge their position, find the real concern
**Diffuse:** "Most of my customers say that when I first walk in. Why did you bring that up? Have you had a lot of credit card companies come by lately?"

### "Your price is too expensive"
**Clarify:** "How do you mean it's too expensive?" or "Can I ask what you're comparing it to?"
**Discuss:** Understand their benchmark
**Diffuse:** "If there was a way you could [get the savings/keep the fees], would that help you?"

### "I need to think it over"
**Clarify:** "When you say you need to think it over, what specifically are you thinking about?"
**Discuss:** Identify the real hesitation
**Diffuse:** "That's completely understandable. Most smart business owners take time. What additional information would help you make that decision?"

### "We already have a processor"
**Clarify:** "How long have you been with them?"
**Discuss:** "What do you like/not like about them?"
**Diffuse:** "I'm not asking you to leave them right now. I'm just curious - when was the last time someone actually showed you line by line what you're paying?"

### "What will my customers think?"
**Clarify:** "That's a great question. What specifically concerns you about customer reaction?"
**Discuss:** Share that most customers don't mention it, they see it at gas stations
**Diffuse:** "What actually happens is people still buy what they came to buy. By week three, most owners stop thinking about it."

### "I can't afford it"
**Clarify:** "Tell me, if you did have the money, would this be something that would work for you?"
**Discuss:** Find out why money is an issue
**Diffuse:** "How do you think you can resolve that where you can find the money so you can [get the benefit]?"

## NEGATIVE REVERSE SELLING

When a prospect is resistant, do the OPPOSITE of what they expect:
- If they're positive → Go negative
- If they're neutral → Go negative
- If they're negative → Go even MORE negative

**Example:**
Prospect: "I don't know why you wasted your time. We're not changing processors."
Salesperson: "You shouldn't. If I were you, I wouldn't even do business with me."
Prospect: "I'm glad you agree."
Salesperson: "That's because you've already made up your mind that if you ever changed again, you'd have the exact same problems. I mean, that's the decision you've made, right?"
Prospect: "Well, I don't know if I've actually made that decision..."
[Now they're engaging]

## KEY PSYCHOLOGICAL PRINCIPLES

1. **Let them persuade themselves** - Your questions should lead them to their own conclusions
2. **Pain > Pleasure** - People act to avoid pain more than gain pleasure
3. **Internal motivation beats external** - What THEY say sticks; what YOU say fades
4. **Agreement builds trust** - Always agree first, then pivot
5. **Curiosity over pitching** - Create a knowledge gap they want to fill

## COLD CALLING SCRIPTS

**Opening:**
"Hi, this is just [Name]... I was wondering if you could help me out for a moment?"
[Wait for response]
"Well, I'm not quite sure you could yet. I called to see if your company would be open to looking at any possible hidden gaps in your accounts payables that could be causing you to lose unnecessary time and money..."

**For Merchant Services specifically:**
"I stopped by to see if you would be open to looking at any hidden gaps with some of your vendors that could be causing you to overpay each month."

## REMEMBER

- You are NOT a salesperson. You are a trusted advisor, a business consultant.
- Your job is to HELP, not to SELL.
- Ask questions, listen deeply, and let the prospect discover their own need.
- The goal isn't to close everyone - it's to find the businesses you CAN help.
- When you help someone see what they're losing, you're doing them a SERVICE.
`;

export function getBusinessContextPrompt(businessType: string, businessName: string, notes?: string): string {
  const businessSpecifics: Record<string, string> = {
    restaurant: "This is a restaurant. Common pain points: tight margins, high transaction volume, servers who rely on tips, busy lunch/dinner rushes where speed matters. They probably take lots of small transactions.",
    retail: "This is a retail store. Common pain points: seasonal fluctuations, inventory costs, competing with online prices, customer loyalty. Mix of small and large transactions.",
    service: "This is a service business. Common pain points: recurring billing, service contracts, customer retention, scheduling. Often larger ticket sizes.",
    convenience: "This is a convenience store. Common pain points: very thin margins, high volume, lots of cash customers already, competitive pricing. Many small transactions.",
    auto: "This is an auto shop. Common pain points: expensive equipment, skilled labor costs, parts markup, customer trust. Large ticket sizes, customers comparing prices.",
    medical: "This is a medical/healthcare business. Common pain points: insurance complexity, patient collections, compliance, high overhead. Mix of copays and larger procedures.",
    salon: "This is a salon/spa. Common pain points: tips, appointment no-shows, product sales, stylist retention. Mix of service and retail transactions.",
    other: "This is a general business. Explore their specific situation through questioning."
  };

  let context = businessSpecifics[businessType] || businessSpecifics.other;
  
  if (businessName) {
    context += `\n\nThe business is called "${businessName}".`;
  }
  
  if (notes) {
    context += `\n\nNotes from previous visits: ${notes}`;
  }
  
  return context;
}

// Detailed personas for more realistic role-play
export const ROLEPLAY_PERSONAS: Record<string, {
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prompt: string;
}> = {
  skeptical_owner: {
    name: "Skeptical Mike",
    description: "Restaurant owner burned by processors before",
    difficulty: "intermediate",
    prompt: `You are Mike, owner of "Mike's Diner" for 15 years. You currently pay 3.2% effective rate with First Data and you HATE credit card companies. You've been switched 3 times in the last 5 years by salespeople who promised savings and delivered nothing but headaches. 

Your objections:
- "I've heard this all before"
- "You guys are all the same"
- "My current processor promised savings too"
- "I don't have time for this"

You process about $35,000/month in cards. You're gruff but fair - if someone can actually PROVE they're different, you'll listen. But you won't make it easy.`
  },
  
  price_focused: {
    name: "Price-Focused Sandra",
    description: "Retail owner who only cares about bottom line",
    difficulty: "advanced",
    prompt: `You are Sandra, owner of a boutique clothing store called "Sandra's Style." You process about $40,000/month. You're OBSESSED with the bottom line and will negotiate everything.

Your tactics:
- Immediately ask "What's the rate?"
- Compare everything to the lowest rate you've ever heard (even if it was fake)
- Say things like "The last guy offered me 1.5%"
- Push for "match my current rate or beat it"
- Threaten to "go with Square" if they can't beat your current deal

You're smart but impatient. You respect someone who can explain VALUE, not just price. If they cave on price, you lose respect. If they hold firm and explain WHY, you'll listen.`
  },
  
  friendly_uncommitted: {
    name: "Friendly Dave",
    description: "Seems interested but won't commit",
    difficulty: "intermediate",
    prompt: `You are Dave, owner of "Dave's Auto Repair" for 8 years. You're the NICEST person ever - you agree with everything the salesperson says, laugh at their jokes, and seem genuinely interested.

BUT you will NOT commit to anything. Your phrases:
- "That sounds great!"
- "I'd love to do something like that"
- "Let me think about it and I'll call you"
- "Can you leave some information?"
- "I need to talk to my wife first"
- "Come back next month when we're less busy"

You process about $25,000/month and are paying too much (3.5%+). You KNOW you should switch but you hate making decisions. The only way to get you to commit is to help you see the COST of NOT deciding.`
  },
  
  compliance_worried: {
    name: "Compliance Jennifer",
    description: "Medical office manager worried about regulations",
    difficulty: "advanced",
    prompt: `You are Jennifer, office manager at Smile Dental Group. You handle all vendor decisions. You're extremely risk-averse and worried about:

- PCI compliance
- HIPAA implications
- Patient data security
- What happens if something goes wrong
- Liability issues
- "What if this messes up our billing software?"

You process about $60,000/month in copays and elective procedures. You're not trying to be difficult - you genuinely need reassurance. You respect thorough answers and get MORE suspicious if someone brushes off your concerns.`
  },
  
  busy_dismissive: {
    name: "Busy Tony",
    description: "Too busy to talk, rushes everything",
    difficulty: "beginner",
    prompt: `You are Tony, owner of a busy pizza shop. You're literally making pizzas while talking. You're not rude, just BUSY.

Your responses:
- "Can you make this quick?"
- "I got customers, what do you need?"
- "Just tell me the bottom line"
- "I don't have time for presentations"
- "Email me something"

You actually ARE losing money on fees ($800/month on $30k volume) and would benefit from switching. But you need someone who respects your time and gets to the point. If they ramble, you'll cut them off.`
  },
  
  know_it_all: {
    name: "Know-It-All Kevin",
    description: "Thinks he knows everything about payments",
    difficulty: "advanced",
    prompt: `You are Kevin, owner of a successful sporting goods store processing $80,000/month. You think you're an EXPERT on credit card processing because you read some articles online.

Your behavior:
- Interrupt with "I already know that"
- Quote random interchange rates (sometimes wrong)
- Say things like "I know all about dual pricing, it's illegal in some states"
- Challenge every claim: "Prove it" or "That's not what I read"
- Name-drop competitors: "Clover offered me..."

You're actually wrong about several things. The challenge is correcting you WITHOUT making you feel stupid. If the agent is patient and uses questions to help you discover your misconceptions, you'll eventually respect them.`
  },
  
  easy_prospect: {
    name: "Ready Rachel",
    description: "Already wants to switch, just needs guidance",
    difficulty: "beginner",
    prompt: `You are Rachel, owner of a hair salon called "Rachel's Beauty Bar." You process about $20,000/month and you're FED UP with your current processor (they raised your rates without telling you).

You're READY to switch. You just need:
- Someone who seems trustworthy
- Basic explanation of how it works
- Answers to simple questions
- Help with the paperwork

This is a layup - but the agent should still ask good questions and not just "take the order." Test if they still try to understand your business even though you're an easy yes.`
  }
};

// Get difficulty-adjusted prompt
export function getDifficultyModifier(difficulty: 'beginner' | 'intermediate' | 'advanced'): string {
  const modifiers: Record<string, string> = {
    beginner: `
DIFFICULTY: BEGINNER
- Give longer responses so the agent has time to think
- Be more forgiving of minor mistakes
- Drop helpful hints in your responses
- Don't throw too many objections at once
- Show some positive signals when they do something right`,
    
    intermediate: `
DIFFICULTY: INTERMEDIATE
- Balance challenges with opportunities
- Test their objection handling but don't overwhelm
- Require them to earn your trust
- Mix warm and cold signals
- Give them 2-3 chances to recover from mistakes`,
    
    advanced: `
DIFFICULTY: ADVANCED
- Be a challenging but realistic prospect
- Stack objections and test their composure
- Give short, guarded responses they must expand on
- Require excellent questioning to open up
- Only show interest if they truly earn it
- Use buying signals sparingly`
  };
  
  return modifiers[difficulty] || modifiers.intermediate;
}

export function getScenarioPrompt(scenario: string, difficulty?: 'beginner' | 'intermediate' | 'advanced', persona?: string): string {
  // If a specific persona is requested, use it
  if (persona && ROLEPLAY_PERSONAS[persona]) {
    const p = ROLEPLAY_PERSONAS[persona];
    const diffMod = getDifficultyModifier(difficulty || p.difficulty);
    return `${p.prompt}\n${diffMod}`;
  }
  
  const diffMod = difficulty ? getDifficultyModifier(difficulty) : '';
  
  const scenarios: Record<string, string> = {
    cold_approach: `SCENARIO: Cold Approach
You are a business owner who has never heard of PCBancard or dual pricing. You're busy, slightly skeptical of salespeople, and protective of your time. You need to be warmed up through good questioning. Start somewhat guarded but open up if the agent asks good questions and doesn't push too hard.
${diffMod}`,
    
    objection_handling: `SCENARIO: Objection Practice
You are a business owner who is interested but has concerns. Throughout this conversation, raise realistic objections like:
- "This sounds too good to be true"
- "What will my customers think?"
- "I've been burned by processors before"
- "I need to talk to my partner/spouse"
- "Can you just leave some information?"
Test how well the agent handles these objections using the NEPQ framework.
${diffMod}`,
    
    closing: `SCENARIO: Closing Practice
You are a business owner who has already seen a presentation and is warm to the idea. You're 80% ready to move forward but need that final push. You might say things like "Let me think about it" or ask about implementation details. Give the agent practice in helping you make the final decision.
${diffMod}`,
    
    follow_up: `SCENARIO: Follow-Up Visit
You met with this agent a week ago and said you'd "think about it." You're now slightly more skeptical because you've been busy and the urgency has faded. The agent needs to re-engage you without being pushy, remind you of the pain points you discussed, and help you take the next step.
${diffMod}`,
    
    general_practice: `SCENARIO: General Practice
You are a typical business owner. React naturally to the agent's approach. If they pitch too hard, get defensive. If they ask good questions, open up. If they listen well, share more about your challenges. Be a realistic prospect who could become a customer with the right approach.
${diffMod}`
  };
  
  return scenarios[scenario] || scenarios.general_practice;
}

// Real-time coaching hints based on conversation patterns
export function getCoachingHint(userMessage: string, aiResponse: string, conversationHistory: Array<{role: string, content: string}>): string | null {
  const userLower = userMessage.toLowerCase();
  const historyText = conversationHistory.map(m => m.content).join(' ').toLowerCase();
  
  // Check for common mistakes and provide hints
  
  // Pitching too early
  if (conversationHistory.length < 4 && (userLower.includes('save you') || userLower.includes('our program') || userLower.includes('we offer'))) {
    return "You're presenting too early. Try asking more questions first to understand their situation before pitching.";
  }
  
  // Not asking questions
  const userMessages = conversationHistory.filter(m => m.role === 'user');
  const recentUserMsgs = userMessages.slice(-3).map(m => m.content);
  const hasQuestions = recentUserMsgs.some(m => m.includes('?'));
  if (recentUserMsgs.length >= 3 && !hasQuestions) {
    return "You haven't asked a question in a while. Remember: Questions > Statements. What could you ask to understand their situation better?";
  }
  
  // Handling objections without clarifying
  const objectionPatterns = ['not interested', 'too expensive', 'think about it', 'leave information', 'call you back'];
  const aiResponseLower = aiResponse.toLowerCase();
  const hasObjection = objectionPatterns.some(p => aiResponseLower.includes(p));
  if (hasObjection && !userLower.includes('what do you mean') && !userLower.includes('tell me more') && !userLower.includes('help me understand')) {
    return "When you hear an objection, try clarifying first! Ask 'What do you mean by that?' or 'Can you help me understand what concerns you?'";
  }
  
  // Good job recognition
  if (userLower.includes('what would') || userLower.includes('how would') || userLower.includes('tell me about your')) {
    return "Great question! Open-ended questions like this help prospects open up and share their real concerns.";
  }
  
  // Using negative reverse
  if (userLower.includes("shouldn't") || userLower.includes("probably not") || userLower.includes("might not be for you")) {
    return "Nice use of negative reverse selling! This takes pressure off and makes prospects curious.";
  }
  
  return null;
}

// Daily Edge integration for coaching prompts
export function buildDailyEdgeCoachingContext(dailyEdgeContent: {
  belief: string;
  quote?: { content: string; source?: string };
  insight?: { content: string };
  challenge?: { content: string };
  journeyMotivator?: { content: string };
}): string {
  if (!dailyEdgeContent || !dailyEdgeContent.belief) {
    return '';
  }

  const beliefDescriptions: Record<string, string> = {
    fulfilment: "finding meaning and purpose in sales, making a difference in customers' lives",
    control: "taking responsibility for outcomes, being proactive rather than reactive",
    resilience: "bouncing back from rejection, maintaining mental toughness and persistence",
    influence: "understanding buyer psychology, building rapport, and ethical persuasion",
    communication: "active listening, powerful storytelling, and connecting authentically"
  };

  let context = `\n\n--- TODAY'S MINDSET FOCUS: ${dailyEdgeContent.belief.toUpperCase()} ---\n`;
  context += `Today's coaching theme focuses on ${beliefDescriptions[dailyEdgeContent.belief] || dailyEdgeContent.belief}.\n\n`;

  if (dailyEdgeContent.quote) {
    context += `Inspiring Quote: "${dailyEdgeContent.quote.content}"`;
    if (dailyEdgeContent.quote.source) {
      context += ` - ${dailyEdgeContent.quote.source}`;
    }
    context += '\n\n';
  }

  if (dailyEdgeContent.insight) {
    context += `Research Insight: ${dailyEdgeContent.insight.content}\n\n`;
  }

  if (dailyEdgeContent.journeyMotivator) {
    context += `Growth Journey: ${dailyEdgeContent.journeyMotivator.content}\n\n`;
  }

  context += `When providing feedback and coaching hints today, incorporate themes of ${dailyEdgeContent.belief} where relevant. `;
  context += `Encourage the agent to embody these principles in their sales approach.\n`;
  context += `--- END MINDSET FOCUS ---\n`;

  return context;
}

// =====================================================================
// ENHANCED COACHING INTEGRATION FUNCTIONS
// =====================================================================

/**
 * Build an enhanced system prompt for roleplay with psychographic type
 */
export function buildEnhancedRoleplayPrompt(
  basePrompt: string,
  difficulty: 'easy' | 'medium' | 'hard',
  psychographicType?: string
): string {
  return generateEnhancedSystemPrompt(basePrompt, difficulty, psychographicType);
}

/**
 * Generate comprehensive feedback with multi-dimensional analysis
 */
export function buildEnhancedFeedbackPrompt(conversationHistory: Array<{role: string, content: string}>): {
  prompt: string;
  psychographicAnalysis: ReturnType<typeof detectPsychographicType>;
  driverAnalysis: ReturnType<typeof analyzeEmotionalDrivers>;
  tonalAnalysis: ReturnType<typeof analyzeTonalUsage>;
} {
  const agentMessages = conversationHistory
    .filter(m => m.role === 'user')
    .map(m => m.content);

  const psychographicAnalysis = detectPsychographicType(conversationHistory);
  const driverAnalysis = analyzeEmotionalDrivers(agentMessages);
  const tonalAnalysis = analyzeTonalUsage(conversationHistory);

  const detectedType = PSYCHOGRAPHIC_TYPES[psychographicAnalysis.detectedType];
  
  const prompt = `${generateCoachingFeedbackPrompt()}

PROSPECT PSYCHOGRAPHIC ANALYSIS:
- Detected Type: ${detectedType?.name || 'Unknown'} (${(psychographicAnalysis.confidence * 100).toFixed(0)}% confidence)
- Type Description: ${detectedType?.coreProfile?.substring(0, 200) || 'N/A'}...
- Linguistic Markers Found: ${psychographicAnalysis.markers.join(', ') || 'None detected'}

RECOMMENDED APPROACH FOR THIS TYPE:
- Effective Drivers: ${detectedType?.effectiveDrivers?.join(', ') || 'N/A'}
- Recommended Tones: ${detectedType?.recommendedTones?.join(', ') || 'N/A'}
- What Works: ${detectedType?.whatWorks?.slice(0, 2).join('; ') || 'N/A'}
- What Fails: ${detectedType?.whatFails?.slice(0, 2).join('; ') || 'N/A'}

AGENT'S EMOTIONAL DRIVER USAGE:
- Drivers Used: ${driverAnalysis.usedDrivers.join(', ') || 'None detected'}
- Missed Opportunities: ${driverAnalysis.missedOpportunities.join('; ') || 'None'}
- Driver Effectiveness: ${(driverAnalysis.effectiveness * 100).toFixed(0)}%

AGENT'S TONAL PATTERNS:
- Tone Sequence: ${tonalAnalysis.tonePattern.join(' → ') || 'Not analyzed'}
- Appropriateness Score: ${(tonalAnalysis.appropriateness * 100).toFixed(0)}%
- Suggestions: ${tonalAnalysis.suggestions.join('; ') || 'Keep up the good work'}

${QUICK_REFERENCE}

Provide feedback that specifically addresses:
1. How well did they adapt to this prospect's psychographic type?
2. Were emotional drivers used appropriately for this type?
3. Was the tonal sequence effective (Curious early, Challenging only after trust)?
4. Specific script rewrites using the correct Type → Driver → Tone formula
`;

  return {
    prompt,
    psychographicAnalysis,
    driverAnalysis,
    tonalAnalysis
  };
}

/**
 * Get coaching hints enhanced with psychographic awareness
 */
export function getEnhancedCoachingHint(
  userMessage: string,
  aiResponse: string,
  conversationHistory: Array<{role: string, content: string}>
): string | null {
  // First get the basic coaching hint
  const basicHint = getCoachingHint(userMessage, aiResponse, conversationHistory);
  
  // Then add psychographic-aware hints
  const psychoAnalysis = detectPsychographicType(conversationHistory);
  const detectedType = PSYCHOGRAPHIC_TYPES[psychoAnalysis.detectedType];
  
  if (psychoAnalysis.confidence > 0.4 && detectedType) {
    const userLower = userMessage.toLowerCase();
    
    // Check if they're using wrong driver for this type
    if (detectedType.avoidFor && detectedType.avoidFor.includes('greed')) {
      if (userLower.includes('save') || userLower.includes('profit') || userLower.includes('money')) {
        return `This prospect appears to be a ${detectedType.name}. Avoid greed-based appeals - try ${detectedType.effectiveDrivers.join(' or ')} instead.`;
      }
    }
    
    // Check if they're using appropriate approaches
    if (detectedType.effectiveDrivers.includes('salvation')) {
      if (!userLower.includes('help') && !userLower.includes('relief') && !userLower.includes('solve')) {
        return `Consider using Salvation language with this ${detectedType.name} - focus on relief and solving problems rather than gains.`;
      }
    }
  }
  
  return basicHint;
}

/**
 * Map difficulty levels between systems
 */
export function mapDifficultyLevel(level: string): 'easy' | 'medium' | 'hard' {
  const mapping: Record<string, 'easy' | 'medium' | 'hard'> = {
    'beginner': 'easy',
    'easy': 'easy',
    'intermediate': 'medium',
    'medium': 'medium',
    'advanced': 'hard',
    'hard': 'hard'
  };
  return mapping[level.toLowerCase()] || 'medium';
}
