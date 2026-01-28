export const SALES_TRAINING_KNOWLEDGE = `
# PCBancard PayLo Sales Training Knowledge Base

## PRODUCT KNOWLEDGE

### What is PayLo (Dual Pricing)?
PayLo is PCBancard's dual pricing program where merchants display two prices: a cash price and a card price. The system automatically calculates and shows both prices, allowing customers to choose how they want to pay. This eliminates 3-4% in processing fees on BOTH credit AND debit cards (unlike surcharging which only works on credit).

### The Three Ways to Stop Losing Money on Processing:
1. **Interchange Plus** - Pay the true cost the card networks charge plus a small fixed fee. Good for white-glove brands where one clean price matters.
2. **Surcharging** - Add a fee to credit card transactions only. Problem: You CANNOT surcharge debit cards (federal law prohibits it). Debit is 30-40% of transactions, so you still pay those fees.
3. **Dual Pricing (PayLo)** - Display cash and card prices. Customers choose. You keep what you earned on ALL card types.

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

export function getScenarioPrompt(scenario: string): string {
  const scenarios: Record<string, string> = {
    cold_approach: `SCENARIO: Cold Approach
You are a business owner who has never heard of PCBancard or dual pricing. You're busy, slightly skeptical of salespeople, and protective of your time. You need to be warmed up through good questioning. Start somewhat guarded but open up if the agent asks good questions and doesn't push too hard.`,
    
    objection_handling: `SCENARIO: Objection Practice
You are a business owner who is interested but has concerns. Throughout this conversation, raise realistic objections like:
- "This sounds too good to be true"
- "What will my customers think?"
- "I've been burned by processors before"
- "I need to talk to my partner/spouse"
- "Can you just leave some information?"
Test how well the agent handles these objections using the NEPQ framework.`,
    
    closing: `SCENARIO: Closing Practice
You are a business owner who has already seen a presentation and is warm to the idea. You're 80% ready to move forward but need that final push. You might say things like "Let me think about it" or ask about implementation details. Give the agent practice in helping you make the final decision.`,
    
    follow_up: `SCENARIO: Follow-Up Visit
You met with this agent a week ago and said you'd "think about it." You're now slightly more skeptical because you've been busy and the urgency has faded. The agent needs to re-engage you without being pushy, remind you of the pain points you discussed, and help you take the next step.`,
    
    general_practice: `SCENARIO: General Practice
You are a typical business owner. React naturally to the agent's approach. If they pitch too hard, get defensive. If they ask good questions, open up. If they listen well, share more about your challenges. Be a realistic prospect who could become a customer with the right approach.`
  };
  
  return scenarios[scenario] || scenarios.general_practice;
}
