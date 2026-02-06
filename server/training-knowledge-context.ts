import { storage } from "./storage";

export function getCompactTrainingKnowledge(): string {
  return `## PCBANCARD PRODUCT KNOWLEDGE
- Dual Pricing: merchants display cash price and card price. System auto-calculates both. Eliminates 3-4% processing fees on ALL card types (credit AND debit).
- Three options: (1) Interchange Plus - true cost + small fee, good for white-glove brands. (2) Surcharging - fee on credit only, CANNOT surcharge debit (federal law), debit is 30-40% of transactions. (3) Dual Pricing - covers ALL card types.
- Key stats: avg 3-4% fee per transaction. $10K-$25K+ annual loss. Only ~1 in 100 customers care about dual pricing. Investment: up to $1,000 upfront.

## NEPQ FRAMEWORK (Neuro-Emotional Persuasion Questions)
5 Stages: Connection → Engagement → Transition → Presentation → Commitment
Core technique: Ask questions that lead prospect to their own conclusions. Never pitch directly.

- Connection: "What was it about [referral] that attracted your attention?" / "Have you found what you're looking for?"
- Situation: "How are you currently processing card payments?" / "How do you feel about what you're paying?"
- Problem Awareness: "Have you ever calculated how much is walking out the door each month?" / "What has that done to your ability to grow?"
- Solution Awareness: "If you could eliminate those fees entirely, what would you do with that money?"
- Consequence: "What happens if nothing changes?" / "What does it cost you to stay where you are?"
- Commitment: "Based on everything we've discussed, where do you see yourself going from here?"

## OBJECTION HANDLING (3-Step: CLARIFY → DISCUSS → DIFFUSE)
- "Not interested": Clarify what they mean → Find real concern → "Most owners say that when I first walk in..."
- "Too expensive": "What are you comparing it to?" → Understand benchmark → Show value vs cost
- "Need to think": "What specifically are you thinking about?" → Identify real hesitation → Offer info to help decide
- "Already have processor": "How long with them? What do you like/not like?" → "When did someone last show you line-by-line what you're paying?"
- "What will customers think?": Address concern → Only ~1 in 100 care, like gas stations → "By week three, most owners stop thinking about it"
- "Can't afford it": "If you had the money, would this work for you?" → Find the real issue → Help them solve it

## PSYCHOLOGICAL PRINCIPLES
1. Let them persuade themselves - questions lead to their own conclusions
2. Pain > Pleasure - people act to avoid loss more than gain
3. Internal motivation beats external - what THEY say sticks
4. Agreement builds trust - always agree first, then pivot
5. Curiosity over pitching - create a knowledge gap they want to fill

## NEGATIVE REVERSE SELLING
When prospect is resistant, do the OPPOSITE of what they expect. If they say "We're not switching," respond: "You shouldn't. If I were you, I wouldn't even do business with me." This breaks their pattern and re-engages them.`;
}

export async function getTrainingKnowledgeForRoleplay(personaId: string): Promise<string> {
  let knowledge = getCompactTrainingKnowledge();

  try {
    const docs = await storage.getTrainingDocuments();
    if (docs && docs.length > 0) {
      let driveContent = '\n\n## CUSTOM TRAINING MATERIALS\n';
      let charBudget = 1000;
      for (const doc of docs) {
        if (charBudget <= 0) break;
        const snippet = (doc.content || '').substring(0, charBudget);
        if (snippet.trim()) {
          driveContent += `### ${doc.fileName}\n${snippet}\n\n`;
          charBudget -= snippet.length;
        }
      }
      knowledge += driveContent;
    }
  } catch (err) {
    console.log('[TrainingKnowledge] Drive content unavailable, using core knowledge only');
  }

  return knowledge.substring(0, 4000);
}

export async function getTrainingKnowledgeForDelivery(): Promise<string> {
  const base = `## PCBANCARD PRESENTATION STRUCTURE
Phase 1 - PROSPECTING: Get the appointment. Drop-in pitch: "Hi, I'm helping local business owners eliminate one of their biggest expenses. Can I schedule 15 minutes?"
Phase 2 - DISCOVERY: Understand needs, collect processing statement. "I'll create a custom proposal showing exactly how much money I can put back into your business."
Phase 3 - PROPOSAL & CLOSE: Present savings, use Option Close. "Which direction would you like to go? Lower rates or eliminate fees with Dual Pricing?"

## KEY PRESENTATION TIPS
- Use alternative choice close for appointment time
- Create social proof by mentioning other businesses
- Keep initial pitch to 30 seconds max
- Give merchant two options - neither being NO
- Use references - have merchants call other merchants doing the program

${getCompactTrainingKnowledge()}`;

  return base.substring(0, 4000);
}

export async function getTrainingKnowledgeForGauntlet(): Promise<string> {
  const base = `## OBJECTION HANDLING MASTERY (CLARIFY → DISCUSS → DIFFUSE)

### "I'm not interested"
CLARIFY: "When you say you're not interested, what do you mean by that?"
DISCUSS: Acknowledge their position, find the real concern
DIFFUSE: "Most of my customers say that when I first walk in. Have you had a lot of credit card companies come by lately?"

### "Too expensive"
CLARIFY: "How do you mean it's too expensive?" / "What are you comparing it to?"
DISCUSS: Understand their benchmark
DIFFUSE: "If there was a way you could get the savings, would that help?"

### "Need to think it over"
CLARIFY: "What specifically are you thinking about?"
DISCUSS: Identify the real hesitation
DIFFUSE: "Most smart business owners take time. What additional information would help?"

### "Already have a processor"
CLARIFY: "How long have you been with them?"
DISCUSS: "What do you like/not like about them?"
DIFFUSE: "When was the last time someone showed you line by line what you're paying?"

### "What will customers think?"
CLARIFY: "What specifically concerns you about customer reaction?"
DISCUSS: Most customers don't mention it - they see it at gas stations
DIFFUSE: "People still buy what they came for. By week three, owners stop thinking about it."

### "Can't afford it"
CLARIFY: "If you did have the money, would this work for you?"
DISCUSS: Find out why money is an issue
DIFFUSE: "How can you resolve that so you can get the benefit?"

### "Don't want to charge customers more"
DIFFUSE: "Only about 1 in 50 business owners find it's not the right fit. That's 2%. Are you willing to give it a chance?"

## NEGATIVE REVERSE SELLING
When prospect is resistant, do the OPPOSITE of what they expect.
Example: "We're not switching." → "You shouldn't. If I were you, I wouldn't either." → Breaks their pattern → Re-engages.

## PSYCHOLOGICAL PRINCIPLES
1. Let them persuade themselves through questions
2. Pain > Pleasure - people avoid loss more than seek gain
3. Internal motivation beats external pressure
4. Agreement builds trust - agree first, then pivot
5. Curiosity over pitching - create knowledge gaps`;

  return base.substring(0, 4000);
}
