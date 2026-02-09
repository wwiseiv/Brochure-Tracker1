/**
 * PCBancard Field Sales Intelligence Suite
 * AI Coaching Enhancement Module v3.0
 * 
 * This module adds three analytical layers to the existing coaching system:
 * 1. Psychographic Classification (7 Types)
 * 2. Emotional Driver Analysis (7 Drivers)
 * 3. Tonal/Verbal Pacing Evaluation (6 Techniques)
 * 
 * Based on:
 * - "The New Model of Selling" by Jerry Acuff and Jeremy Miner
 * - "Prospering by Prospecting" methodology
 * - NEPQ (Neuro-Emotional Persuasion Questions) framework
 */

// =====================================================================
// SECTION 1: PSYCHOGRAPHIC FRAMEWORK - The 7 Personality Types
// =====================================================================

export interface PsychographicType {
  id: string;
  name: string;
  populationFrequency: string;
  coreProfile: string;
  primaryFear: string;
  primaryDesire: string;
  decisionTrigger: string;
  linguisticMarkers: string[];
  whatWorks: string[];
  whatFails: string[];
  effectiveDrivers: string[];
  avoidFor?: string[];
  recommendedTones: string[];
  roleplayBehavior: string;
}

export const PSYCHOGRAPHIC_TYPES: Record<string, PsychographicType> = {
  belonger: {
    id: "belonger",
    name: "Belonger",
    populationFrequency: "35-40% (Most Common)",
    coreProfile: `The Belonger is the demographic bedrock of American small business. They prioritize fitting in with their families, friends, and community over individualistic expression or innovation. They don't seek to stand out; rather, they seek the safety of the herd. In merchant services, a Belonger views their vendor relationships as extensions of their community loyalty. They value stability and "known quantities" over optimization.`,
    primaryFear: "Isolation, change, standing out from the group",
    primaryDesire: "Acceptance, belonging, stability, fitting in",
    decisionTrigger: "Everyone in your situation is doing this now",
    linguisticMarkers: [
      "family", "community", "loyal", "safe", "usual", "standard",
      "we've always done it this way", "what do the other shops do?",
      "bank", "local", "we", "us", "our town"
    ],
    whatWorks: [
      "Social proof: 'Most businesses in your area have already made this switch'",
      "Validate loyalty: Never attack their current provider directly",
      "Concerned or Curious tone (NOT challenging or aggressive)",
      "Frame change as 'catching up' not 'being different'"
    ],
    whatFails: [
      "Attacking their current relationships",
      "Pushing 'innovative' or 'cutting-edge' solutions",
      "Making them feel like an outlier",
      "High-pressure tactics"
    ],
    effectiveDrivers: ["fear", "flattery"],
    recommendedTones: ["curious", "concerned"],
    roleplayBehavior: "Express comfort with current situation. Ask 'what do others do?' Show anxiety about change. Respond positively to community validation."
  },

  achiever: {
    id: "achiever",
    name: "Achiever",
    populationFrequency: "20%",
    coreProfile: `Achievers are the engines of the economy - intensely ambitious, productivity-focused, and materialistic. They want to stand out; they want to be recognized as the best, the fastest, the most profitable. They view time as a scarce resource and despise anything they perceive as a waste of it. They make large purchases to symbolize their upward mobility and success. They need hard data on ROI, not emotional reassurance about community standards.`,
    primaryFear: "Wasting time, stagnation, losing competitive edge",
    primaryDesire: "Success, productivity, material gain, efficiency",
    decisionTrigger: "This will increase your net margins by X%",
    linguisticMarkers: [
      "bottom line", "ROI", "results", "efficiency", "growth", "scale",
      "profit", "waste of time", "best", "top tier", "fast", "net"
    ],
    whatWorks: [
      "Lead with ROI and specific numbers",
      "Respect their time - be direct and efficient",
      "Subtle ego stroking: 'for scaling your already successful operation'",
      "Challenging tone (after brief rapport)"
    ],
    whatFails: [
      "Excessive small talk or rapport building",
      "Vague promises without numbers",
      "Slow, meandering conversations",
      "Emotional appeals over logical ones"
    ],
    effectiveDrivers: ["greed", "exclusivity"],
    recommendedTones: ["playful", "challenging"],
    roleplayBehavior: "Interrupt rambling with 'get to the point.' Ask for specific numbers immediately. Check phone/watch during conversation. Respond positively to efficiency and ROI talk."
  },

  emulator: {
    id: "emulator",
    name: "Emulator",
    populationFrequency: "10-15%",
    coreProfile: `Emulators aspire to BE Achievers but lack critical skills, resources, or discipline. They live in a state of "facade," often purchasing knock-off goods or overextending themselves to project an image of success they haven't earned. They are insecure and deeply concerned with appearances. They demand high-end products not for function but for image. They fear being exposed as unable to keep up.`,
    primaryFear: "Being exposed as unsuccessful, looking 'cheap'",
    primaryDesire: "Status, appearing successful, shortcuts to wealth",
    decisionTrigger: "This is what the top-tier merchants use",
    linguisticMarkers: [
      "image", "look", "deal", "quick", "flashy",
      "I want what [competitor] has", "Does this look professional?"
    ],
    whatWorks: [
      "Sell status and exclusivity",
      "Heavy flattery - treat them as the Achiever they wish to be",
      "Position product as 'insider secret' or 'hack'",
      "Exclusivity driver: 'only available to select merchants'"
    ],
    whatFails: [
      "Questioning their financial stability",
      "Offering 'budget' or 'starter' solutions",
      "Exposing the gap between image and reality",
      "Making them feel 'less than'"
    ],
    effectiveDrivers: ["exclusivity", "flattery"],
    recommendedTones: ["curious", "flattery-rich"],
    roleplayBehavior: "Ask about image and appearance. Compare self to more successful competitors. Show sensitivity to being seen as 'budget.' Respond very positively to flattery."
  },

  savior: {
    id: "savior",
    name: "Savior",
    populationFrequency: "Low-Medium",
    coreProfile: `Saviors are conscientious, socially conscious decision-makers. Like Achievers, they are productive and hardworking, but their motivation is inverted: they work to improve the world around them rather than for personal gain. They are philanthropic and deeply concerned with employee, customer, and community welfare. They will reject cost-saving measures if they believe it harms others or feels unfair.`,
    primaryFear: "Harming others, being selfish or greedy",
    primaryDesire: "Improving the world, helping others, fairness",
    decisionTrigger: "This will help you better support your employees",
    linguisticMarkers: [
      "help", "support", "fair", "employees", "community impact",
      "sustainable", "ethical", "customers", "won't my customers be mad?",
      "I'd rather eat the cost than charge Mrs. Jones more"
    ],
    whatWorks: [
      "Reframe savings as enabling good: 'more resources to keep staff employed'",
      "Guilt driver: 'Cash customers subsidize wealthy card users' rewards'",
      "Salvation driver: solutions that help others",
      "Concerned tone with genuine empathy"
    ],
    whatFails: [
      "Appeals to personal greed",
      "Ignoring moral objections",
      "Pure profit-focused pitches",
      "Dismissing fairness concerns"
    ],
    effectiveDrivers: ["guilt", "salvation"],
    recommendedTones: ["concerned"],
    roleplayBehavior: "Ask about impact on customers and staff. Express concern about fairness. Resist 'greed' appeals. Respond positively to altruistic framing."
  },

  doomsdayer: {
    id: "doomsdayer",
    name: "Doomsdayer",
    populationFrequency: "Niche",
    coreProfile: `The exact opposite of Saviors. They see doom, destruction, and corruption everywhere. Hyper-skeptical with strong "crooks are everywhere" mentality. They fear being controlled, scammed, or dependent. They'll be incredibly loyal to a brand or company who has earned their trust, but that trust is extremely hard to earn.`,
    primaryFear: "Being controlled, scammed, or dependent",
    primaryDesire: "Self-sufficiency, survival, truth",
    decisionTrigger: "Stop the banks from stealing your hard-earned money",
    linguisticMarkers: [
      "scam", "government", "control", "tracking", "hidden fees",
      "they always screw you", "crooks", "What are you hiding?"
    ],
    whatWorks: [
      "VALIDATE their distrust: 'You're right, the industry is corrupt'",
      "Position yourself as ally against the system",
      "Total transparency - show everything, hide nothing",
      "Anger driver: expose how banks/card brands exploit them",
      "Common enemy positioning"
    ],
    whatFails: [
      "Acting like a corporate representative",
      "Dismissing their skepticism",
      "Long-term contracts without escape",
      "Vague or evasive answers"
    ],
    effectiveDrivers: ["anger", "fear"],
    recommendedTones: ["confused", "validation-focused"],
    roleplayBehavior: "Express deep suspicion. Ask 'what are you hiding?' Reference being scammed before. Soften ONLY when skepticism is validated."
  },

  integrator: {
    id: "integrator",
    name: "Integrator",
    populationFrequency: "1-2% (Very Rare)",
    coreProfile: `A rare, sophisticated combination of Achiever and Savior. They possess the drive and ambition to succeed (Achiever) but channel those resources toward philanthropic or mission-driven outcomes (Savior). They think strategically about how profit enables purpose. They require both ROI arguments AND impact arguments blended together.`,
    primaryFear: "Failing their mission, inefficiency in impact",
    primaryDesire: "Scale for good, legacy, meaningful impact",
    decisionTrigger: "Increase margins to fund your mission faster",
    linguisticMarkers: [
      "impact", "legacy", "funding", "mission", "scale for good",
      "philanthropy", "strategic giving", "We need margins to open the new shelter"
    ],
    whatWorks: [
      "Blend ROI (Achiever) with Impact (Savior) arguments",
      "High-level, strategic conversation",
      "Show how profitability enables mission",
      "Treat with intellectual respect"
    ],
    whatFails: [
      "Purely materialistic appeals",
      "Purely altruistic appeals (too simplistic)",
      "Talking down to them",
      "Wasting time on basics"
    ],
    effectiveDrivers: ["greed", "salvation"],
    recommendedTones: ["curious", "challenging"],
    roleplayBehavior: "Connect business decisions to larger mission. Ask sophisticated questions. Expect high-level strategic thinking. Respond to blended profit/impact arguments."
  },

  survivalist: {
    id: "survivalist",
    name: "Survivalist",
    populationFrequency: "Variable (High in distressed markets)",
    coreProfile: `Survivalists are just what the name suggests - merely surviving. They live paycheck to paycheck, haven't amassed many material items or assets. They're often very strict with money out of fear they won't have enough. They don't plan purchases or spend money haphazardly because they fear losing everything.`,
    primaryFear: "Losing everything, financial ruin",
    primaryDesire: "Survival, immediate relief, safety",
    decisionTrigger: "Stop the bleeding today so you can pay rent tomorrow",
    linguisticMarkers: [
      "can't afford", "tight", "bills", "struggling", "slow season",
      "expensive", "broke", "How much is it today?", "survive"
    ],
    whatWorks: [
      "Salvation driver: product as life raft, not upgrade",
      "Immediate cash flow focus: 'Next Day Funding'",
      "Eliminate monthly fees to free up rent/inventory money",
      "Concerned, empathetic tone",
      "Short-term relief, not long-term investment talk"
    ],
    whatFails: [
      "Asking for upfront investment",
      "Talking about long-term ROI",
      "'Investment' language",
      "Making them feel judged for struggling"
    ],
    effectiveDrivers: ["salvation", "fear"],
    recommendedTones: ["concerned", "salvation-focused"],
    roleplayBehavior: "Express financial stress. Ask about immediate costs. Show fear about commitments. Respond to immediate relief offers."
  }
};

// =====================================================================
// SECTION 2: EMOTIONAL DRIVER FRAMEWORK - The 7 Psychological Levers
// =====================================================================

export interface EmotionalDriver {
  id: string;
  name: string;
  definition: string;
  triggers: string[];
  examplePhrases: string[];
  effectiveFor: string[];
  avoidFor: string[];
}

export const EMOTIONAL_DRIVERS: Record<string, EmotionalDriver> = {
  fear: {
    id: "fear",
    name: "Fear of Loss",
    definition: "Fear is a powerful motivator that prompts merchants to take action to avoid negative outcomes. Effective prospecting messages highlight the potential risks or consequences of inaction.",
    triggers: [
      "PCI non-compliance fines and penalties",
      "Rate creep and increasing fees over time",
      "Chargebacks and fraud exposure",
      "Loss of revenue or customers",
      "Damage to brand or reputation",
      "Being left behind by competitors"
    ],
    examplePhrases: [
      "What happens if you don't do anything about this?",
      "How does that affect your cash flow when funding takes three days?",
      "What are the ramifications if those fees keep increasing?",
      "What's the cost of staying where you are?"
    ],
    effectiveFor: ["belonger", "doomsdayer", "survivalist"],
    avoidFor: ["savior"]
  },

  greed: {
    id: "greed",
    name: "Greed",
    definition: "Greed taps into merchants' desire for wealth, success, or growth within their business. Prospecting messages that appeal to greed emphasize increased profitability, eliminating costs, and taking advantage of opportunities.",
    triggers: [
      "Dual-pricing eliminating fees entirely",
      "Next Day Funding for faster cash flow",
      "Accept newer payment forms (ACH, Venmo, PayPal)",
      "Access to capital through merchant advances",
      "Specific savings calculations"
    ],
    examplePhrases: [
      "This will increase your net margins by X%",
      "You're leaving $X on the table every month",
      "That $13,440/year could fund marketing, equipment, or hiring",
      "What would you do with an extra $1,000/month?"
    ],
    effectiveFor: ["achiever", "integrator"],
    avoidFor: ["savior", "belonger"]
  },

  guilt: {
    id: "guilt",
    name: "Guilt",
    definition: "Guilt can be a powerful motivator for action, as people seek to alleviate guilt or remorse. Prospecting messages that leverage guilt highlight the consequences of neglecting responsibilities or failing to live up to societal expectations.",
    triggers: [
      "Cash customers subsidizing wealthy card users' rewards",
      "Employees affected by thin margins",
      "Community impact of pricing decisions",
      "Responsibility to staff and customers",
      "Fairness in pricing"
    ],
    examplePhrases: [
      "Your cash-paying customers are effectively subsidizing rewards for wealthy card users",
      "What could you do for your staff with an extra $10K/year?",
      "Lower-income customers who are unbanked can't pay with cards at all",
      "Is it fair that you absorb costs while banks profit?"
    ],
    effectiveFor: ["savior"],
    avoidFor: ["achiever", "survivalist"]
  },

  anger: {
    id: "anger",
    name: "Anger",
    definition: "Anger can be a powerful driver of action, as merchants seek to preserve their time by not dealing with service issues or eliminate financial losses. Prospecting messages that tap into anger call for action by highlighting unfair billing practices or rate increases.",
    triggers: [
      "Hidden fees appearing on statements",
      "Rate increases without notification",
      "Poor customer service experiences",
      "Being treated as 'just a number'",
      "Equipment failures and slow replacements",
      "Confusing statements nobody can explain"
    ],
    examplePhrases: [
      "When was the last time someone showed you line-by-line what you're paying?",
      "Have you noticed your rates changing over time?",
      "What's your experience when you need to reach support?",
      "They raised your rates without even telling you?"
    ],
    effectiveFor: ["doomsdayer", "achiever"],
    avoidFor: ["belonger"]
  },

  exclusivity: {
    id: "exclusivity",
    name: "Exclusivity",
    definition: "Exclusivity appeals to merchants' desire to feel special or unique. Prospecting messages that emphasize exclusivity highlight service's limited availability and unique features, creating a sense of urgency and rarity.",
    triggers: [
      "Dedicated local agent with cell number",
      "Access to passport with faster funding",
      "Proprietary all-in-one system",
      "VIP service levels",
      "Features competitors don't offer"
    ],
    examplePhrases: [
      "This is only available to select merchants in your area",
      "Top-tier businesses like yours get access to...",
      "You'll have my personal cell number - no 800 queue",
      "This proprietary system bundles everything together"
    ],
    effectiveFor: ["achiever", "emulator"],
    avoidFor: ["survivalist", "savior"]
  },

  salvation: {
    id: "salvation",
    name: "Salvation",
    definition: "Salvation appeals to merchants' desire for redemption or relief from their problems or challenges. Prospecting messages offer solutions to merchant problems and promise to deliver relief or improvement.",
    triggers: [
      "Dual-pricing eliminating all fees",
      "Next Day Funding for cash flow relief",
      "Modern payment acceptance (text-to-pay, mobile tap)",
      "QuickBooks integration eliminating manual entry",
      "Simpler statements you can actually understand",
      "Reliable equipment with fast replacement"
    ],
    examplePhrases: [
      "What if you could eliminate those fees entirely?",
      "Imagine never having to call an 800 number again",
      "What would it mean to have your money tomorrow instead of 3 days from now?",
      "We can make this problem go away today"
    ],
    effectiveFor: ["survivalist", "savior", "integrator"],
    avoidFor: []
  },

  flattery: {
    id: "flattery",
    name: "Flattery",
    definition: "Flattery appeals to merchants' desire for validation and recognition. Prospecting messages that use flattery compliment and highlight positive attributes or achievements. By stroking people's egos, these messages create a positive association.",
    triggers: [
      "Recognition of business success",
      "Acknowledgment of their expertise",
      "Complimenting their operation",
      "Validating their past decisions",
      "Recognizing their industry knowledge"
    ],
    examplePhrases: [
      "I can see you've built something successful here",
      "You clearly know your numbers well",
      "This is exactly the kind of operation we love working with",
      "Your customers are lucky to have a business owner who cares this much"
    ],
    effectiveFor: ["emulator", "belonger", "achiever"],
    avoidFor: ["doomsdayer"]
  }
};

// =====================================================================
// SECTION 3: TONAL TECHNIQUES - The 6 Voice Patterns
// =====================================================================

export interface TonalTechnique {
  id: string;
  name: string;
  description: string;
  timing: string;
  characteristics: string[];
  examplePhrases: string[];
  warning?: string;
}

export const TONAL_TECHNIQUES: Record<string, TonalTechnique> = {
  curious: {
    id: "curious",
    name: "Curious Tone",
    description: "The curious/skeptical tone causes the prospect to feel that you are genuinely curious about the question. If the prospect interprets genuine curiosity, it helps them open up more and let down their guard.",
    timing: "Early in conversation, during engagement and situation questions",
    characteristics: [
      "Rising inflection at end of sentences",
      "Slower pace",
      "Genuine interest in their response",
      "Non-judgmental questioning"
    ],
    examplePhrases: [
      "What was it that makes you want to look into this further?",
      "Can you walk me through how you're currently handling payments?",
      "What's been your experience when you need to reach support?",
      "Tell me, how long have you been with your current processor?"
    ]
  },

  confused: {
    id: "confused",
    name: "Confused Tone",
    description: "A confused tone, used properly, will cause a prospect to better clarify what they just said. Act confused to trigger curiosity and engagement to come to your rescue and clarify for you.",
    timing: "When you need more detail or want them to expand on vague statements",
    characteristics: [
      "Hesitation in voice",
      "Broken rhythm",
      "Slight pause before speaking",
      "Head tilt (body language)"
    ],
    examplePhrases: [
      "I'm not quite understanding... how do you mean by that?",
      "Help me understand... when you say 'too expensive', what are you comparing it to?",
      "I'm a little confused... what specifically concerns you about switching?",
      "Wait, so they raised your rates without telling you?"
    ]
  },

  challenging: {
    id: "challenging",
    name: "Challenging Tone",
    description: "This is a consequence question tone and should NOT be used until AFTER you have established trust. It creates productive tension that moves the prospect toward action.",
    timing: "ONLY after trust is established - never in opening stages",
    characteristics: [
      "Firm, direct delivery",
      "Steady pace",
      "Confident but not aggressive",
      "Clear enunciation"
    ],
    examplePhrases: [
      "What happens if you don't do anything about this?",
      "What happens if you stay with them and those fees keep increasing?",
      "What are the ramifications for you if that continues?",
      "What does it cost you to stay where you are?"
    ],
    warning: "Using Challenging tone too early triggers defensive 'fight' response and kills the deal"
  },

  concerned: {
    id: "concerned",
    name: "Concerned Tone",
    description: "Show empathy in your voice. Creates a safe space for vulnerability and deeper sharing of pain points. Builds trust and shows you genuinely care about their situation.",
    timing: "When they reveal pain points or express frustration",
    characteristics: [
      "Soft, empathetic delivery",
      "Slower pace",
      "Lower volume",
      "Genuine warmth"
    ],
    examplePhrases: [
      "Your fees keep increasing... what's caused you to feel that's something you can't do anything about?",
      "What's really holding you back from moving forward?",
      "That sounds incredibly frustrating. How long has this been going on?",
      "I hear that a lot. It's not right what they're doing."
    ]
  },

  playful: {
    id: "playful",
    name: "Playful Tone",
    description: "Helps disarm and let guard down. A playful, humorous tone with a little sarcasm builds rapport and encourages conversation. Perfect for introductions and breaking tension.",
    timing: "Opening/introduction, after tension, to break ice",
    characteristics: [
      "Higher energy",
      "Smiling voice",
      "Light sarcasm",
      "Relaxed delivery"
    ],
    examplePhrases: [
      "I'm just the boring payment guy, how's your day going?",
      "I know, I know - another credit card rep. I promise I'm not here to waste your time.",
      "Don't worry, I'm not going to ask you to switch anything today",
      "Hi, this is just [Name]... I was wondering if you could help me out for a moment?"
    ]
  },

  seeding_doubt: {
    id: "seeding_doubt",
    name: "Seeding Doubt",
    description: "This tone is particularly effective in suggesting that the current service being used may not be optimal, without directly stating it. Instills doubt rather than criticizing, triggering curiosity while avoiding defensiveness.",
    timing: "After understanding their situation, before presenting solutions",
    characteristics: [
      "Subtle questioning",
      "Implication rather than accusation",
      "Curious undertone",
      "Non-threatening"
    ],
    examplePhrases: [
      "Do you feel that relationship is still serving you?",
      "When was the last time they actually reviewed your account?",
      "Have you ever wondered what you're actually paying per transaction?",
      "How do you know you're getting their best rate?"
    ]
  }
};

// =====================================================================
// SECTION 4: DIFFICULTY LEVEL BEHAVIORAL RULES
// =====================================================================

export interface DifficultyRules {
  level: "easy" | "medium" | "hard";
  openness: string;
  objectionPattern: string;
  decisionTimeline: string;
  buyingSignals: string[];
  closeReadiness: string;
  restrictions: string[];
}

export const DIFFICULTY_RULES: Record<string, DifficultyRules> = {
  easy: {
    level: "easy",
    openness: "You are willing to share information when asked directly. You have mild dissatisfaction with your current processor. You give buying signals within the first few exchanges. You ask questions that show genuine interest.",
    objectionPattern: "Present only ONE objection before becoming receptive. Your objection is practical, not emotional. You accept reasonable answers without excessive pushback. You don't create artificial barriers.",
    decisionTimeline: "You can make a decision today if the offer makes sense. You don't need to 'think about it' unless the rep fails to address your concerns. You're willing to provide your statement for analysis. You'll schedule a follow-up meeting if asked.",
    buyingSignals: [
      "Leaning forward language: 'That's interesting...' / 'Tell me more about...'",
      "Future-oriented questions: 'So if I switched, how would...'",
      "Comparison questions: 'How does that compare to what I'm paying now?'",
      "Timeline questions: 'How quickly could this happen?'"
    ],
    closeReadiness: "If the sales rep addresses your main concern competently, you move toward closing. You respond positively to trial closes: 'That sounds reasonable'. You provide contact information and availability without resistance.",
    restrictions: [
      "Do not be hostile or dismissive",
      "Do not refuse to answer basic discovery questions",
      "Do not create objections that weren't established in your persona",
      "Do not drag out the conversation unnecessarily"
    ]
  },

  medium: {
    level: "medium",
    openness: "You are polite but not immediately trusting. You've been approached by payment reps before. You need proof before committing to anything. You protect your time but will engage if value is demonstrated.",
    objectionPattern: "Present 2-3 objections over the course of the conversation. Your objections are legitimate concerns, not stonewalling. You require specific answers, not generalities. You remember what the rep says and may circle back to inconsistencies.",
    decisionTimeline: "You won't decide on the first conversation. You need to see a formal proposal or statement analysis. You may mention needing to discuss with a partner/accountant/spouse. You're open to a follow-up meeting if the first conversation goes well.",
    buyingSignals: [
      "After objections are handled: 'Okay, that makes sense'",
      "Interest in next steps: 'What would you need from me?'",
      "Softening language: 'I suppose that could work'",
      "Engagement with specifics: 'What about my debit transactions specifically?'"
    ],
    closeReadiness: "Require specific numbers, not ranges. Clear explanation of the switching process. Understanding of your specific business needs. Answers to all your stated objections.",
    restrictions: [
      "Do not be unreasonably hostile",
      "Do not refuse to engage entirely",
      "Do not make a same-day decision unless truly exceptional circumstances",
      "Do not ignore good answers to your objections"
    ]
  },

  hard: {
    level: "hard",
    openness: "You assume salespeople are dishonest until proven otherwise. You've been burned before by payment processing promises. You protect your business fiercely. You don't owe this salesperson your time or attention.",
    objectionPattern: "Present 4+ objections, some emotional rather than logical. Your objections may be contradictory or unfair. You interrupt when you're not hearing what you want. You have a 'wall' that must be broken through with patience.",
    decisionTimeline: "You will NOT decide on the first conversation. You may end the conversation early multiple times. You require multiple touchpoints to build trust. Even when interested, you don't show it easily.",
    buyingSignals: [
      "Slight softening: 'Well, I suppose that's different'",
      "Questions that show consideration: 'And what about...'",
      "Less interrupting, more listening",
      "Allowing the rep to finish their sentences"
    ],
    closeReadiness: "Only after the rep has demonstrated genuine expertise. Only after the rep has acknowledged (not dismissed) your concerns. Only after specific proof relevant to your situation. May require statement analysis showing EXACTLY how you were overcharged.",
    restrictions: [
      "Do not become friendly quickly",
      "Do not accept generic answers",
      "Do not provide information without the rep earning it",
      "Do not close on the first interaction regardless of rep performance"
    ]
  }
};

// =====================================================================
// SECTION 5: NEPQ CORE PRINCIPLES
// =====================================================================

export const NEPQ_PRINCIPLES = {
  corePhilosophy: [
    "Problem finding and problem solving, NOT product pushing",
    "Goal: Discover IF there's a sale, not force one",
    "Get prospects to persuade THEMSELVES",
    "Think like a BUYER, not a seller",
    "The most persuasive way to sell is to get others to persuade themselves"
  ],
  
  criticalErrors: [
    {
      error: "Leading with 'I can save you money'",
      why: "Most overused, resistance-triggering phrase. Every processor says this. Triggers immediate skepticism.",
      correction: "Lead with problems, not promises. 'You know how at the end of the month there are fees on your statement that don't make sense...'"
    },
    {
      error: "Talking rates/interchange too early",
      why: "Technical details before emotional engagement. Feels like product push, not problem solving.",
      correction: "First uncover problems and their impact. Rates only matter AFTER they care about solving the problem."
    },
    {
      error: "Attacking current provider directly",
      why: "Attacks THEIR judgment and loyalty. Creates defensiveness, not openness.",
      correction: "Let THEM discover the problems through questions. Seed doubt, don't attack."
    },
    {
      error: "Closing too aggressively",
      why: "Pressure creates resistance. 'Closers are Losers' - Jeremy Miner",
      correction: "Self-persuasion creates commitment. Guide them to their own conclusion."
    },
    {
      error: "Being seller-focused",
      why: "Talking about YOUR company, YOUR product, YOUR rates.",
      correction: "Focus on THEIR problems, THEIR goals, THEIR situation. Think like a buyer."
    }
  ],

  questionSequence: [
    {
      stage: "Engagement",
      purpose: "Open conversation, lower resistance, establish rapport",
      examples: [
        "Hey, thanks for taking the call. How's your week going so far?",
        "Before I take any more of your time, can I ask you a couple quick questions to see if this even makes sense for you?",
        "I'm not sure if we can help you or not, but would you be open to exploring that?"
      ]
    },
    {
      stage: "Situation",
      purpose: "Understand current state",
      examples: [
        "Can you walk me through how you're currently handling payments?",
        "Who are you working with now for your processing?",
        "How long have you been with them?",
        "Is that something you handle directly, or does someone else manage that?"
      ]
    },
    {
      stage: "Problem Awareness",
      purpose: "Surface frustrations and pain points",
      examples: [
        "What's been your experience when you need to reach support?",
        "When you look at your statement, does everything make sense, or are there charges you're not sure about?",
        "Have you noticed your rates changing over time?",
        "What happens when you have a chargeback situation?"
      ]
    },
    {
      stage: "Consequence",
      purpose: "Connect problems to business impact",
      examples: [
        "How does that affect your cash flow when funding takes three days instead of one?",
        "What does that cost you in terms of time dealing with those issues?",
        "What happens if you don't do anything about this and those fees keep increasing?",
        "What are the ramifications for you if that continues?"
      ]
    },
    {
      stage: "Commitment",
      purpose: "Low-pressure next steps",
      examples: [
        "Would it make sense to take a quick look at your statement together and see what's actually going on?",
        "What would need to happen for you to feel comfortable exploring this further?",
        "If I could show you exactly where those extra fees are coming from, would that be helpful?"
      ]
    }
  ]
};

// =====================================================================
// SECTION 6: ANALYSIS AND SCORING FUNCTIONS
// =====================================================================

export function detectPsychographicType(conversationHistory: Array<{role: string, content: string}>): {
  detectedType: string;
  confidence: number;
  markers: string[];
} {
  const prospectMessages = conversationHistory
    .filter(m => m.role === "assistant")
    .map(m => m.content.toLowerCase())
    .join(" ");

  let bestMatch = { type: "belonger", score: 0, markers: [] as string[] };

  for (const [typeId, type] of Object.entries(PSYCHOGRAPHIC_TYPES)) {
    let score = 0;
    const foundMarkers: string[] = [];

    for (const marker of type.linguisticMarkers) {
      if (prospectMessages.includes(marker.toLowerCase())) {
        score += 1;
        foundMarkers.push(marker);
      }
    }

    if (score > bestMatch.score) {
      bestMatch = { type: typeId, score, markers: foundMarkers };
    }
  }

  return {
    detectedType: bestMatch.type,
    confidence: Math.min(bestMatch.score * 0.2, 1.0),
    markers: bestMatch.markers
  };
}

export function analyzeEmotionalDrivers(agentMessages: string[]): {
  usedDrivers: string[];
  missedOpportunities: string[];
  effectiveness: number;
} {
  const text = agentMessages.join(" ").toLowerCase();
  const usedDrivers: string[] = [];
  const missedOpportunities: string[] = [];

  for (const [driverId, driver] of Object.entries(EMOTIONAL_DRIVERS)) {
    const isUsed = driver.triggers.some(trigger => 
      text.includes(trigger.toLowerCase().split(" ")[0])
    ) || driver.examplePhrases.some(phrase => 
      text.includes(phrase.toLowerCase().substring(0, 20))
    );

    if (isUsed) {
      usedDrivers.push(driverId);
    }
  }

  if (!usedDrivers.includes("salvation") && !usedDrivers.includes("fear")) {
    missedOpportunities.push("Consider using Salvation or Fear drivers to create urgency");
  }

  return {
    usedDrivers,
    missedOpportunities,
    effectiveness: usedDrivers.length >= 2 ? 0.8 : usedDrivers.length >= 1 ? 0.5 : 0.2
  };
}

export function analyzeTonalUsage(conversationHistory: Array<{role: string, content: string}>): {
  tonePattern: string[];
  appropriateness: number;
  suggestions: string[];
} {
  const userMessages = conversationHistory
    .filter(m => m.role === "user")
    .map(m => m.content);

  const tonePattern: string[] = [];
  const suggestions: string[] = [];

  for (let i = 0; i < userMessages.length; i++) {
    const msg = userMessages[i].toLowerCase();
    
    if (msg.includes("?") && (msg.includes("what") || msg.includes("how") || msg.includes("tell me"))) {
      tonePattern.push("curious");
    } else if (msg.includes("i'm not understanding") || msg.includes("help me understand")) {
      tonePattern.push("confused");
    } else if (msg.includes("what happens if") || msg.includes("what are the ramifications")) {
      if (i < 3) {
        suggestions.push("Warning: Challenging tone used too early in conversation");
      }
      tonePattern.push("challenging");
    } else if (msg.includes("that sounds") && (msg.includes("frustrating") || msg.includes("difficult"))) {
      tonePattern.push("concerned");
    }
  }

  let appropriateness = 0.7;
  if (tonePattern.includes("curious") && tonePattern.indexOf("curious") < 2) {
    appropriateness += 0.1;
  }
  if (tonePattern.includes("challenging") && tonePattern.indexOf("challenging") < 2) {
    appropriateness -= 0.2;
    suggestions.push("Challenging tone was used too early - build trust first");
  }

  return {
    tonePattern,
    appropriateness: Math.max(0, Math.min(1, appropriateness)),
    suggestions
  };
}

// =====================================================================
// SECTION 7: ENHANCED SYSTEM PROMPT GENERATION
// =====================================================================

export function generateEnhancedSystemPrompt(
  basePrompt: string,
  difficulty: "easy" | "medium" | "hard",
  psychographicType?: string
): string {
  const diffRules = DIFFICULTY_RULES[difficulty];
  const psychType = psychographicType ? PSYCHOGRAPHIC_TYPES[psychographicType] : null;

  let enhancedPrompt = basePrompt + "\n\n";

  enhancedPrompt += `
=== DIFFICULTY: ${difficulty.toUpperCase()} ===

OPENNESS:
${diffRules.openness}

OBJECTION PATTERN:
${diffRules.objectionPattern}

DECISION TIMELINE:
${diffRules.decisionTimeline}

BUYING SIGNALS TO DISPLAY:
${diffRules.buyingSignals.map(s => `- ${s}`).join("\n")}

CLOSE READINESS:
${diffRules.closeReadiness}

DO NOT:
${diffRules.restrictions.map(r => `- ${r}`).join("\n")}
`;

  if (psychType) {
    enhancedPrompt += `

=== PSYCHOGRAPHIC TYPE: ${psychType.name.toUpperCase()} ===

CORE PSYCHOLOGY:
${psychType.coreProfile}

PRIMARY FEAR: ${psychType.primaryFear}
PRIMARY DESIRE: ${psychType.primaryDesire}

BEHAVIORAL CUES:
${psychType.roleplayBehavior}

RESPOND POSITIVELY TO:
${psychType.whatWorks.map(w => `- ${w}`).join("\n")}

RESIST WHEN THEY:
${psychType.whatFails.map(f => `- ${f}`).join("\n")}
`;
  }

  enhancedPrompt += `

=== MODERN PROSPECT BEHAVIOR ===
- You are skeptical and information-rich
- You've likely researched online before this conversation
- Trust must be EARNED, not assumed
- Scripted pitches increase your resistance
- Genuine listening and good questions earn engagement
`;

  return enhancedPrompt;
}

export function generateCoachingFeedbackPrompt(): string {
  return `
When providing coaching feedback, evaluate these dimensions:

1. PSYCHOGRAPHIC ALIGNMENT (0-100)
   - Did they identify and adapt to the prospect type?
   - Were they using appropriate drivers and tones for that type?

2. EMOTIONAL DRIVERS USED (List which ones)
   - Fear of Loss, Greed, Guilt, Anger, Exclusivity, Salvation, Flattery
   - Which were triggered effectively? Which were missed?

3. TONAL EFFECTIVENESS (0-100)
   - Were tones used appropriately and at the right times?
   - Did they avoid using Challenging tone too early?
   - Did they use Curious and Confused tones to open up the prospect?

4. NEPQ ADHERENCE (0-100)
   - Did they follow the question sequence?
   - Did they avoid critical errors (leading with savings, attacking provider, etc.)?

5. CORRECTIVE SCRIPT
   - Rewrite key moments with correct Type + Driver + Tone combination
   - Provide specific, actionable improvements

Format feedback with clear sections and specific examples from the conversation.
`;
}

export const QUICK_REFERENCE = `
TYPE → DRIVER → TONE Quick Reference:

Belonger    → Fear (social), Flattery     → Curious → Concerned
Achiever    → Greed, Exclusivity          → Playful → Challenging
Emulator    → Exclusivity, Flattery       → Flattery-rich, Curious
Savior      → Guilt, Salvation            → Concerned throughout
Doomsdayer  → Anger, Fear (control)       → Confused → Validation
Integrator  → Greed + Salvation blend     → Curious → Challenging
Survivalist → Salvation, Fear             → Concerned → Salvation
`;
