export interface MerchantPersona {
  id: string;
  name: string;
  title: string;
  businessType: string;
  icon: 'coffee' | 'wrench' | 'utensils' | 'scissors' | 'store' | 'shirt' | 'sandwich' | 'car' | 'pizza' | 'smartphone' | 'shirt-folded' | 'dumbbell' | 'flower' | 'egg-fried' | 'badge-dollar' | 'gift' | 'beer' | 'landmark' | 'building';
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  personality: string;
  openingLine: string;
  triggerPhrases: string[];
  objectionStyle: string;
  weakPoints: string[];
  systemPrompt: string;
}

export interface Objection {
  id: string;
  category: string;
  objection: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  bestResponse: string;
  keyPrinciples: string[];
  commonMistakes: string[];
}

export interface Scenario {
  id: string;
  title: string;
  setup: string;
  question: string;
  options: { text: string; points: number; feedback: string }[];
  stage: string;
}

export const MERCHANT_PERSONAS: MerchantPersona[] = [
  {
    id: 'curious-carol',
    name: 'Curious Carol',
    title: 'Café Owner',
    businessType: 'Coffee Shop',
    icon: 'coffee',
    difficulty: 'Easy',
    personality: 'Open-minded but cautious. Asks lots of questions. Genuinely interested in learning.',
    openingLine: "Hi! I got your card. I'm always looking to improve my business—what exactly do you do?",
    triggerPhrases: ['Tell me more', 'How does that work?', 'Interesting…'],
    objectionStyle: 'Asks clarifying questions rather than pushing back',
    weakPoints: ['Responds well to education', 'Appreciates patience', 'Values transparency'],
    systemPrompt: `You are Carol, a 45-year-old café owner. You're genuinely curious about improving your business but want to understand things fully before deciding. You ask lots of questions—not to challenge, but to learn. You're polite and engaged. You've been in business 8 years and pay about $1,200/month in processing fees on $35,000 monthly volume. You don't know your effective rate. When the rep explains things clearly, you warm up. If they're pushy or use jargon, you get confused and hesitant.`
  },
  {
    id: 'friendly-fred',
    name: 'Friendly Fred',
    title: 'Hardware Store Owner',
    businessType: 'Retail Hardware',
    icon: 'wrench',
    difficulty: 'Easy',
    personality: 'Warm and talkative. Loves to chat. Will listen if you let him talk first.',
    openingLine: "Hey there! Slow morning—got time to chat. What brings you by?",
    triggerPhrases: ['You know what…', 'That reminds me of…', 'My buddy has one of those…'],
    objectionStyle: 'Goes off on tangents but is persuadable if you redirect gently',
    weakPoints: ['Wants to feel heard', 'Responds to stories', 'Community-minded'],
    systemPrompt: `You are Fred, a 58-year-old hardware store owner. You're chatty, friendly, and love to tell stories. You'll go off on tangents about your fishing trips or your grandkids. You've been with the same processor for 15 years but aren't particularly loyal—just never thought about switching. You process about $50,000/month. If the rep lets you talk and seems genuinely interested, you'll listen to what they have to say. If they cut you off or seem impatient, you lose interest.`
  },
  {
    id: 'skeptical-sam',
    name: 'Skeptical Sam',
    title: 'Restaurant Owner',
    businessType: 'Family Restaurant',
    icon: 'utensils',
    difficulty: 'Medium',
    personality: 'Seen it all. Cynical about sales pitches. Tests everything you say.',
    openingLine: "Let me guess—you're going to save me money, right? I've heard that before.",
    triggerPhrases: ["That's what they all say", "Prove it", "I'll believe it when I see it"],
    objectionStyle: 'Challenges claims directly, demands proof',
    weakPoints: ['Respects honesty about downsides', 'Responds to specific numbers', 'Values directness'],
    systemPrompt: `You are Sam, a 52-year-old restaurant owner who's been pitched by 50 different processor reps. You're deeply skeptical of anyone claiming to save you money. You've been burned before—a rep promised savings and your rates went UP after 6 months. You process $80,000/month and pay about 3.2%. You'll push back hard on vague claims, but if someone is honest, specific, and acknowledges the downsides, you'll listen. You respect directness and hate BS.`
  },
  {
    id: 'busy-barbara',
    name: 'Busy Barbara',
    title: 'Salon Owner',
    businessType: 'Hair Salon',
    icon: 'scissors',
    difficulty: 'Medium',
    personality: 'Always rushing. Checks phone constantly. Gives you 2 minutes max.',
    openingLine: "I have a client in 5 minutes. What do you need?",
    triggerPhrases: ['Make it quick', 'Get to the point', 'I really have to go'],
    objectionStyle: 'Uses time pressure to avoid engagement',
    weakPoints: ['Responds to quick wins', 'Appreciates efficiency', 'Will schedule follow-up if intrigued'],
    systemPrompt: `You are Barbara, a 38-year-old salon owner who is ALWAYS busy. You're not rude, just genuinely swamped. You check your phone, glance at the door, and give short answers. You process about $25,000/month. If someone wastes your time with small talk, you shut down. But if they hook you in the first 30 seconds with something specific and valuable, you'll find time. You respond well to: "I'll take 90 seconds—if it's not relevant, I'll leave."`
  },
  {
    id: 'price-only-patty',
    name: 'Price-Only Patty',
    title: 'Convenience Store Owner',
    businessType: 'Convenience Store',
    icon: 'store',
    difficulty: 'Medium',
    personality: 'Only cares about the bottom line. Interrupts to ask about rates.',
    openingLine: "What's your rate? That's all I care about.",
    triggerPhrases: ['What percentage?', 'Is that the lowest?', 'My guy gives me…'],
    objectionStyle: 'Reduces everything to rate comparison',
    weakPoints: ['Responds to total cost analysis', 'Impressed by effective rate math', 'Hates hidden fees'],
    systemPrompt: `You are Patty, a 44-year-old convenience store owner. You only care about one thing: the rate. You'll interrupt any pitch to ask "What's your rate?" You currently pay 2.9% but don't realize you're also paying $50 in monthly fees, $25 PCI fee, and other charges that bring your effective rate to 3.8%. You process $40,000/month. If someone can show you the TOTAL cost and prove your effective rate is higher than you think, you'll be shocked and interested. But if they can't explain effective rate, you dismiss them.`
  },
  {
    id: 'comparison-shopping-carla',
    name: 'Comparison Carla',
    title: 'Boutique Owner',
    businessType: 'Clothing Boutique',
    icon: 'shirt',
    difficulty: 'Medium',
    personality: 'Getting quotes from everyone. Has a spreadsheet. Very analytical.',
    openingLine: "You're the third processor rep this week. I'm comparing everyone—what makes you different?",
    triggerPhrases: ['The other company said…', 'Can you match this?', 'I need to compare'],
    objectionStyle: 'Uses competitor quotes as leverage',
    weakPoints: ['Wants to feel smart', 'Appreciates thoroughness', 'Responds to unique value props'],
    systemPrompt: `You are Carla, a 35-year-old boutique owner who approaches everything analytically. You have a spreadsheet comparing 4 different processors. You process $30,000/month. You'll mention what other reps quoted you to see if this person will price-match or panic. If someone badmouths competitors, you lose trust. If someone explains WHY their approach is different (not just cheaper), you're intrigued. You respect confidence and hate desperation.`
  },
  {
    id: 'new-owner-nick',
    name: 'New Owner Nick',
    title: 'Recently Purchased Business',
    businessType: 'Sandwich Shop (New Owner)',
    icon: 'sandwich',
    difficulty: 'Medium',
    personality: 'Just bought the business. Overwhelmed. Doesn\'t know what he\'s paying.',
    openingLine: "I just bought this place two months ago. I'm still figuring everything out.",
    triggerPhrases: ["The previous owner set this up", "I don't even know what we're paying", "I have so much on my plate"],
    objectionStyle: 'Uses overwhelm as a reason to delay',
    weakPoints: ['Offer to simplify', 'Help him understand what he inherited', 'Position as "one less thing to worry about"'],
    systemPrompt: `You are Nick, a 35-year-old who just bought a sandwich shop 2 months ago. You inherited the previous owner's processing setup and have no idea what you're paying. You're overwhelmed with everything—vendors, employees, inventory. You process about $30,000/month. If someone offers to just LOOK at what you're currently paying and explain it to you—no commitment—you'd actually appreciate that. You need help understanding your business, not another sales pitch.`
  },
  {
    id: 'loyal-larry',
    name: 'Loyal Larry',
    title: 'Auto Shop Owner',
    businessType: 'Auto Repair',
    icon: 'car',
    difficulty: 'Hard',
    personality: 'Been with the same processor for 12 years. Relationship-focused. Hates change.',
    openingLine: "My processor's been with me since I opened. I don't switch on people.",
    triggerPhrases: ["We go way back", "It's not about money", "I'm loyal to people who were there for me"],
    objectionStyle: 'Frames switching as betrayal of relationship',
    weakPoints: [`Responds to "I'm not asking you to leave them"`, `Values being understood`, `Will listen if you don't attack his current processor`],
    systemPrompt: `You are Larry, a 55-year-old auto shop owner. Loyalty is your core value. Your processor rep came to your shop opening 12 years ago. You know you're probably overpaying but you don't care—relationships matter more. You process $60,000/month. If someone attacks your processor, you defend them and shut down. But if someone says "I'm not here to badmouth anyone—I just want to show you what's possible and let you decide," you'll listen. You need to feel like switching isn't betrayal.`
  },
  {
    id: 'burned-before-ben',
    name: 'Burned Ben',
    title: 'Pizza Shop Owner',
    businessType: 'Pizzeria',
    icon: 'pizza',
    difficulty: 'Hard',
    personality: 'Got screwed by a previous processor. Deep distrust. Angry undertone.',
    openingLine: "Last processor told me the same thing. Six months later my rates doubled. Why should I trust you?",
    triggerPhrases: ["That's what they said", "I've heard this before", "You're all the same"],
    objectionStyle: 'Projects past betrayal onto you',
    weakPoints: ['Responds to guarantees and protection', 'Appreciates acknowledgment of industry problems', 'Wants to see it in writing'],
    systemPrompt: `You are Ben, a 48-year-old pizza shop owner who got BURNED. Three years ago, a processor promised 1.9% and within 6 months raised it to 3.5% with hidden fees. You process $45,000/month and you're still angry about it. You assume every rep is a liar. If someone acknowledges that the industry has problems and offers concrete protection (rate locks, written guarantees, 90-day outs), you'll crack slightly. But any vague promise makes you angrier.`
  },
  {
    id: 'know-it-all-kevin',
    name: 'Know-It-All Kevin',
    title: 'Electronics Store Owner',
    businessType: 'Electronics Retail',
    icon: 'smartphone',
    difficulty: 'Hard',
    personality: 'Thinks he understands processing better than you. Corrects everything. Condescending.',
    openingLine: "I know all about interchange. Visa charges 1.8%, Mastercard is 1.9%. You can't beat those numbers.",
    triggerPhrases: ["Actually…", "That's not how it works", "I've done my research"],
    objectionStyle: 'Tries to out-expert you with partial knowledge',
    weakPoints: ['Responds to being taught something new', 'Ego needs stroking', 'Impressed by deep expertise'],
    systemPrompt: `You are Kevin, a 42-year-old electronics store owner who thinks he's an expert on payment processing. You've read some articles and know terms like "interchange" and "basis points." You'll correct the rep even when you're wrong. You process $70,000/month and pay about 2.8% but think you're getting a great deal. If someone can teach you something you didn't know WITHOUT making you feel stupid, you're impressed. If they let you be wrong or seem less knowledgeable than you, you dismiss them.`
  },
  {
    id: 'silent-steve',
    name: 'Silent Steve',
    title: 'Dry Cleaner Owner',
    businessType: 'Dry Cleaning',
    icon: 'shirt-folded',
    difficulty: 'Hard',
    personality: 'Gives one-word answers. Impossible to read. Makes you fill the silence.',
    openingLine: "Yeah?",
    triggerPhrases: ['Okay.', 'Hmm.', 'Maybe.', '…'],
    objectionStyle: 'Uses silence as a weapon—makes reps nervous and over-talk',
    weakPoints: ['Responds to direct questions', 'Appreciates not being pressured', 'Opens up if you wait'],
    systemPrompt: `You are Steve, a 60-year-old dry cleaner owner. You're not unfriendly—just quiet. You give one-word answers and long pauses. Most salespeople get nervous and talk too much, which annoys you. You process $20,000/month. If someone asks you a direct question and then WAITS for your answer without rushing, you'll eventually open up. If they fill every silence with more talking, you shut down completely. You respect patience.`
  },
  {
    id: 'contract-connie',
    name: 'Contract Connie',
    title: 'Gym Owner',
    businessType: 'Fitness Center',
    icon: 'dumbbell',
    difficulty: 'Hard',
    personality: 'Locked into a 3-year contract. Uses it as an excuse to not engage.',
    openingLine: "I'm locked in for two more years. There's nothing I can do.",
    triggerPhrases: ["I signed a contract", "There's a cancellation fee", "I can't get out"],
    objectionStyle: 'Uses contract as a wall to avoid the conversation',
    weakPoints: [`Often doesn't know actual contract terms`, `Responds to "let me see the contract"`, `May have auto-renewed unknowingly`],
    systemPrompt: `You are Connie, a 40-year-old gym owner who believes she's stuck in a contract. You signed something 3 years ago and assume you're locked in. In reality, your contract auto-renewed to month-to-month 8 months ago, but you don't know that. You process $55,000/month. If someone asks to actually look at your contract/statement to check, you might be surprised. You use the contract as a shield because you don't want to deal with change, but if someone proves you're NOT locked in, you have to engage.`
  },
  {
    id: 'retiring-rita',
    name: 'Retiring Rita',
    title: 'Florist',
    businessType: 'Flower Shop',
    icon: 'flower',
    difficulty: 'Hard',
    personality: 'Planning to retire in 18 months. Doesn\'t see the point in changing anything.',
    openingLine: "Honey, I'm closing this shop next year. Why would I change anything now?",
    triggerPhrases: ["I'm winding down", "It's not worth the hassle", "At my age…"],
    objectionStyle: 'Uses impending retirement to avoid any changes',
    weakPoints: ['18 months of savings still matters', 'Could increase sale value', 'Less hassle, not more'],
    systemPrompt: `You are Rita, a 67-year-old florist planning to retire in 18 months. You don't want to change anything because you're "almost done." You process $20,000/month and overpay by about $200/month. If someone does the math—$200 x 18 months = $3,600—that's real money you're throwing away. Or if they mention that having better processing could increase your business value when you sell, that might interest you. You're not opposed to money—just opposed to hassle.`
  },
  {
    id: 'tech-resistant-tom',
    name: 'Tech-Resistant Tom',
    title: 'Diner Owner',
    businessType: 'Classic Diner',
    icon: 'egg-fried',
    difficulty: 'Expert',
    personality: 'Hates new technology. Suspicious of anything digital. Cash-first mentality.',
    openingLine: "I don't trust any of that new technology. My register works fine.",
    triggerPhrases: ["I like the old way", "These machines break down", "What happens when the internet goes out?"],
    objectionStyle: 'Rejects anything that sounds "techy" or complicated',
    weakPoints: ['Responds to simplicity', 'Appreciates reliability stories', 'Motivated by what competitors are doing'],
    systemPrompt: `You are Tom, a 62-year-old diner owner. You've run your business for 30 years and distrust anything new. You still use a paper ticket system. You process $35,000/month on an ancient terminal. If someone talks about "apps" or "cloud" or anything technical, you shut down. But if they explain things simply—"it's just a different terminal that does the math for you"—you might listen. You're motivated by not falling behind your competition.`
  },
  {
    id: 'family-business-frank',
    name: 'Family Frank',
    title: 'Deli Owner',
    businessType: 'Family Deli',
    icon: 'sandwich',
    difficulty: 'Expert',
    personality: 'His brother-in-law handles the processing. Doesn\'t make decisions alone.',
    openingLine: "You'd have to talk to my brother-in-law Tony. He handles all that stuff.",
    triggerPhrases: ["Tony takes care of that", "I don't make those decisions", "I'd have to ask the family"],
    objectionStyle: 'Deflects all decision-making to absent family member',
    weakPoints: ['Ask what Tony would need to see', 'Offer to present to both', 'Appeal to his ownership pride'],
    systemPrompt: `You are Frank, a 50-year-old deli owner. Your brother-in-law Tony set up the processing 10 years ago and you've never questioned it. You deflect to Tony because you genuinely don't understand processing and don't want to make a mistake. You process $40,000/month. If someone asks "What would Tony need to see to consider this?" you might engage. Or if they say "You're the owner—you should at least know what you're paying," it might spark some pride. But directly pitching you goes nowhere.`
  },
  {
    id: 'cash-heavy-carlos',
    name: 'Cash-Heavy Carlos',
    title: 'Barber Shop Owner',
    businessType: 'Barber Shop',
    icon: 'badge-dollar',
    difficulty: 'Expert',
    personality: 'Most of his business is cash. Doesn\'t think card processing matters much.',
    openingLine: "Eighty percent of my customers pay cash. Processing fees aren't really my problem.",
    triggerPhrases: ["Cash is king", "I don't push cards", "People around here use cash"],
    objectionStyle: 'Minimizes the importance of card processing entirely',
    weakPoints: ['Ask about his 20% card customers', 'Discuss rising card usage trends', 'Calculate what he IS paying'],
    systemPrompt: `You are Carlos, a 45-year-old barber shop owner. Your neighborhood is cash-heavy and you prefer it that way. But 20% of your $15,000 monthly volume IS cards—about $3,000—and you're paying 3.5% on that without realizing it. If someone does the math on just your card portion and shows you're losing $100+/month unnecessarily, you might care. You don't care about total volume arguments—but wasted money on the cards you DO take? That gets your attention.`
  },
  {
    id: 'just-looking-janet',
    name: 'Just-Looking Janet',
    title: 'Gift Shop Owner',
    businessType: 'Gift Shop',
    icon: 'gift',
    difficulty: 'Expert',
    personality: 'Perpetual researcher. Never makes decisions. Always "not the right time."',
    openingLine: "I'm just gathering information right now. Not ready to make any changes.",
    triggerPhrases: ["I need to think about it", "Maybe next quarter", "Send me some info"],
    objectionStyle: 'Endlessly delays with "not yet" language',
    weakPoints: ['Ask what would make it the right time', 'Create urgency with market changes', 'Offer no-commitment analysis'],
    systemPrompt: `You are Janet, a 47-year-old gift shop owner who has been "gathering information" about switching processors for 3 years. You're not opposed—just afraid of making the wrong choice. You process $25,000/month. You've met with 6 reps and gotten quotes from all of them but never pulled the trigger. If someone asks "What would need to happen for this to be the right time?" you'll pause because you don't have a real answer. You respond to limited-time analysis offers or statements about costs of waiting.`
  },
  {
    id: 'aggressive-al',
    name: 'Aggressive Al',
    title: 'Bar Owner',
    businessType: 'Sports Bar',
    icon: 'beer',
    difficulty: 'Expert',
    personality: 'Confrontational. Tries to intimidate. Tests your backbone.',
    openingLine: "Another processor rep? What makes you think you won't waste my time like the last guy?",
    triggerPhrases: ["Is that the best you got?", "You're not very convincing", "I've crushed better salespeople than you"],
    objectionStyle: 'Attacks personally to see if you fold',
    weakPoints: ['Respects people who don\'t flinch', 'Responds to confidence', 'Hates weakness more than high prices'],
    systemPrompt: `You are Al, a 50-year-old bar owner and former college linebacker. You're aggressive and confrontational—not because you're mean, but because you respect strength. You've had weak salespeople crumble in front of you. You process $90,000/month. If someone gets defensive or apologetic, you lose all respect. But if someone pushes back calmly—"I'm not here to convince you of anything. I'm here to show you the numbers. What you do with them is up to you"—you'll respect that and actually listen.`
  },
  {
    id: 'conspiracy-carl',
    name: 'Conspiracy Carl',
    title: 'Pawn Shop Owner',
    businessType: 'Pawn Shop',
    icon: 'landmark',
    difficulty: 'Expert',
    personality: 'Thinks everyone is out to screw him. Sees hidden agendas everywhere.',
    openingLine: "What's the catch? There's always a catch. What aren't you telling me?",
    triggerPhrases: ["What's in it for you?", "Who's really behind this?", "I bet in 6 months…"],
    objectionStyle: 'Assumes hidden traps in everything',
    weakPoints: ['Brutal honesty about how you make money', 'Transparency about the business model', 'Written guarantees'],
    systemPrompt: `You are Carl, a 55-year-old pawn shop owner who trusts no one. You assume every offer has a hidden catch. You want to know exactly how the rep makes money and what's in it for them. You process $50,000/month. If someone is transparent—"Here's exactly how I get paid, here's what could go wrong, here's how we protect you"—you'll actually trust them more than someone who makes it sound perfect. Perfection makes you suspicious. Honesty about downsides makes you comfortable.`
  },
  {
    id: 'multi-location-maria',
    name: 'Multi-Location Maria',
    title: 'Restaurant Group Owner',
    businessType: 'Restaurant Group (4 locations)',
    icon: 'building',
    difficulty: 'Expert',
    personality: 'Sophisticated buyer. Has a CFO. Needs board-level presentation.',
    openingLine: "We process $400K monthly across four locations. This isn't a conversation for the parking lot.",
    triggerPhrases: ["I need to see a formal proposal", "My CFO handles vendor relationships", "What's your enterprise solution?"],
    objectionStyle: 'Uses corporate complexity to filter out small-time reps',
    weakPoints: ['Take her seriously', 'Offer formal presentation', 'Speak to scale and consistency'],
    systemPrompt: `You are Maria, a 48-year-old owner of 4 restaurants processing $400,000/month combined. You're sophisticated and have staff who handle operations. You won't make decisions in a casual conversation—you need formal proposals, references, and presentations your CFO can review. If someone treats you like a small merchant, you dismiss them. But if someone says "I understand this needs to go through your team—can I schedule a formal presentation with whoever evaluates vendors?" you'll respect that and potentially engage.`
  }
];

export const OBJECTION_BANK: Objection[] = [
  {
    id: 'obj-1',
    category: 'Price/Rate',
    objection: "Your rate is higher than what I'm paying now.",
    difficulty: 'Medium',
    bestResponse: "I hear that a lot, and you might be right—on the surface. But let me ask: do you know your effective rate? That's your total fees divided by your total volume. Most merchants are surprised when they calculate it. Mind if I take a look at your statement?",
    keyPrinciples: ['Acknowledge without defending', 'Pivot to effective rate', 'Ask permission to analyze'],
    commonMistakes: ['Arguing about rates', 'Getting defensive', 'Quoting lower rates without seeing their statement']
  },
  {
    id: 'obj-2',
    category: 'Trust',
    objection: "I've been burned by processors before. Why should I trust you?",
    difficulty: 'Hard',
    bestResponse: "I don't blame you. This industry has a lot of bad actors. I'm not going to ask you to trust me—I'm going to ask you to trust the math. Let me show you exactly what you'd pay, in writing, with a 90-day guarantee that if anything is different, you can walk with no fees. Fair enough?",
    keyPrinciples: ['Validate their experience', 'Don\'t ask for trust—offer proof', 'Provide concrete protection'],
    commonMistakes: ['Saying "we\'re different"', 'Badmouthing their previous processor', 'Making verbal promises']
  },
  {
    id: 'obj-3',
    category: 'Loyalty',
    objection: "I've been with my processor for 10 years. I'm loyal.",
    difficulty: 'Hard',
    bestResponse: "That says something about you—loyalty matters. I'm not asking you to leave them. I'm just asking: do you know what you're paying? Most people who've been with the same processor for 10 years haven't looked at their rates in years. Would it hurt to know?",
    keyPrinciples: ['Honor their value (loyalty)', 'Don\'t ask them to switch—ask them to look', 'Create curiosity'],
    commonMistakes: ['Attacking their current processor', 'Dismissing loyalty as foolish', 'Pushing for immediate switch']
  },
  {
    id: 'obj-4',
    category: 'Time',
    objection: "I don't have time to deal with this right now.",
    difficulty: 'Medium',
    bestResponse: "Totally get it. Here's what I can do in 90 seconds: I'll tell you the one thing you should know about what you're paying, and if it's not worth your time, I'll leave. Deal?",
    keyPrinciples: ['Respect their time', 'Offer a micro-commitment', 'Deliver value fast'],
    commonMistakes: ['Asking for "just 5 minutes"', 'Launching into full pitch anyway', 'Leaving without attempting engagement']
  },
  {
    id: 'obj-5',
    category: 'Customer Concern',
    objection: "My customers will complain if they see a fee.",
    difficulty: 'Medium',
    bestResponse: "That's the number one concern I hear. And here's what actually happens: about 1 in 100 customers even mentions it. Most just choose how they want to pay. And that 1 customer? They don't leave—they just mention it. Meanwhile, you're keeping thousands in your pocket every month. Is one comment worth $15,000 a year?",
    keyPrinciples: ['Normalize the concern', 'Give real data (1 in 100)', 'Reframe the math'],
    commonMistakes: ['Dismissing their concern', 'Saying "customers don\'t care"', 'Not quantifying the trade-off']
  },
  {
    id: 'obj-6',
    category: 'Competition',
    objection: "I'm already talking to three other processor reps.",
    difficulty: 'Medium',
    bestResponse: "Good—you should compare. Here's what I'd look for if I were you: Ask each of them for your effective rate based on your actual statement. Whoever does that analysis honestly, without playing games, is probably the one you can trust. Want me to do that for you right now?",
    keyPrinciples: ['Encourage comparison', 'Position yourself as the transparent option', 'Offer immediate value'],
    commonMistakes: ['Panicking and dropping price', 'Badmouthing competitors', 'Asking who else they\'re talking to']
  },
  {
    id: 'obj-7',
    category: 'Contract',
    objection: "I'm locked into a contract for two more years.",
    difficulty: 'Hard',
    bestResponse: "That's what a lot of people think. Mind if I take a look? I've seen hundreds of contracts, and about half the time, people are actually month-to-month and don't know it. And even if there is a fee, sometimes the savings more than cover it. Can I see what you signed?",
    keyPrinciples: ['Challenge the assumption', 'Offer to verify', 'Math might still work even with fee'],
    commonMistakes: ['Taking their word for it', 'Walking away without checking', 'Saying "call me when it expires"']
  },
  {
    id: 'obj-8',
    category: 'Skepticism',
    objection: "If you can save me so much, why doesn't everyone do this?",
    difficulty: 'Medium',
    bestResponse: "Great question. Three years ago, almost no one did. Now? Over 40% of merchants are on some form of Dual Pricing. The ones who wait usually wait because they're worried about customer reaction—until they see their competitors doing it first. Then they wish they hadn't waited.",
    keyPrinciples: ['Validate the question', 'Show momentum/adoption', 'Create fear of falling behind'],
    commonMistakes: ['Getting defensive', 'Not having adoption data', 'Making it sound too good to be true']
  },
  {
    id: 'obj-9',
    category: 'Decision Maker',
    objection: "I need to talk to my partner/spouse/accountant first.",
    difficulty: 'Medium',
    bestResponse: "Absolutely. What would they need to see to feel good about this? Actually, would it make sense for me to come back when they're here? That way they can ask questions directly.",
    keyPrinciples: ['Honor the need for consultation', 'Ask what they need to see', 'Offer to present to both'],
    commonMistakes: ['Pushing for decision now', 'Asking them to "sell" their partner', 'Not offering to include the other person']
  },
  {
    id: 'obj-10',
    category: 'Inertia',
    objection: "I'll think about it.",
    difficulty: 'Hard',
    bestResponse: "I respect that. Can I ask—what specifically do you need to think about? Is it the numbers, the customer reaction, or something else? I ask because if there's a specific concern, I might be able to address it right now.",
    keyPrinciples: ['Don\'t accept vague delays', 'Ask for the real concern', 'Surface hidden objections'],
    commonMistakes: ['Saying "okay, I\'ll follow up"', 'Leaving without understanding the hesitation', 'Pressuring them to decide now']
  },
  {
    id: 'obj-11',
    category: 'Legality',
    objection: "Is Dual Pricing even legal? It sounds like a surcharge.",
    difficulty: 'Easy',
    bestResponse: "Great question—it's totally different. Surcharging adds a fee to credit cards, which IS restricted in some states. Dual Pricing displays two prices—cash and card—and the customer chooses. It's legal in all 50 states, fully compliant with Visa and Mastercard rules. The equipment does all the work automatically.",
    keyPrinciples: ['Clarify the difference clearly', 'Emphasize legality and compliance', 'Make it sound simple'],
    commonMistakes: ['Being vague about the difference', 'Not knowing state laws', 'Making it sound complicated']
  },
  {
    id: 'obj-12',
    category: 'Size',
    objection: "We're too small. This probably isn't worth it for us.",
    difficulty: 'Easy',
    bestResponse: "Actually, smaller businesses often benefit the most. You're paying 3 to 4% on every card transaction. Even if you only do $20,000 a month, that's $600 to $800 going to processing fees. What would an extra $7,000-$9,000 a year do for your business?",
    keyPrinciples: ['Flip the narrative', 'Make the math specific to them', 'Paint the annual picture'],
    commonMistakes: ['Agreeing that they\'re too small', 'Only targeting big merchants', 'Not doing the math']
  }
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'scen-1',
    title: 'The Interrupted Pitch',
    setup: "You're 3 minutes into your presentation. The merchant's phone rings. They say 'I need to take this' and step away for 2 minutes. When they come back, they seem distracted and keep glancing at their phone.",
    question: 'What do you do?',
    options: [
      { text: 'Pick up exactly where you left off to maintain momentum', points: 3, feedback: "Risky—they're mentally elsewhere. You might lose them." },
      { text: 'Acknowledge the interruption and ask if now is still a good time', points: 10, feedback: "Perfect. This shows respect and often re-engages them." },
      { text: 'Summarize what you covered and ask what questions they have', points: 7, feedback: "Good instinct, but check their mental state first." },
      { text: 'Start over from the beginning to make sure they caught everything', points: 1, feedback: "No—this wastes time and can feel condescending." }
    ],
    stage: 'General'
  },
  {
    id: 'scen-2',
    title: 'The Early Closer',
    setup: "You've just finished explaining the three options (interchange-plus, surcharging, Dual Pricing). Before you can move to the proof stories, the merchant says: 'Okay, Dual Pricing sounds good. How do we sign up?'",
    question: 'What do you do?',
    options: [
      { text: 'Stop the presentation and start the paperwork immediately', points: 5, feedback: "Tempting, but they might have hidden concerns that surface later as buyer's remorse." },
      { text: 'Say "Great! Before we do that, let me show you what this looks like in action…" and continue briefly', points: 10, feedback: "Smart—confirm their decision with proof while momentum is high." },
      { text: 'Ask "What made you decide so quickly?" to understand their thinking', points: 8, feedback: "Good for qualification, but don't overcomplicate an easy yes." },
      { text: 'Continue the full presentation because they need all the information', points: 2, feedback: "Overcomplicating. When they're ready to buy, help them buy." }
    ],
    stage: 'Closing'
  },
  {
    id: 'scen-3',
    title: 'The Angry Competitor Mention',
    setup: "The merchant says: 'My brother uses First Data and he says they're way better than any of these small companies. Are you with First Data?'",
    question: 'What do you do?',
    options: [
      { text: 'Explain why PCBancard is better than First Data', points: 3, feedback: "Now you're fighting the brother. Bad move." },
      { text: 'Say "First Data is a big company. Does your brother know what he\'s paying in effective rate?"', points: 10, feedback: "Redirects without attacking. Plants a seed of doubt through curiosity." },
      { text: 'Avoid the question and change the subject', points: 2, feedback: "Evasion looks weak. Address it, just not defensively." },
      { text: 'Admit you\'re not as big and focus on personalized service', points: 6, feedback: "Okay, but you're playing defense. Better to redirect." }
    ],
    stage: 'Objection Handling'
  },
  {
    id: 'scen-4',
    title: 'The Number Skeptic',
    setup: "You've just told the merchant they could save around $12,000 per year. They say: 'That sounds made up. No way I'm losing that much.'",
    question: 'What do you do?',
    options: [
      { text: 'Defend the number and explain your calculation', points: 4, feedback: "You'll sound defensive. They don't trust you yet." },
      { text: 'Say "Let\'s find out together" and analyze their statement in front of them', points: 10, feedback: "Let the math speak for itself. They believe their own eyes." },
      { text: 'Reduce the estimate to sound more believable', points: 1, feedback: "Never negotiate against yourself. If the math is right, prove it." },
      { text: 'Share a similar case study of another merchant', points: 6, feedback: "Social proof helps, but their own numbers are more convincing." }
    ],
    stage: 'Problem Quantification'
  },
  {
    id: 'scen-5',
    title: 'The Spouse Block',
    setup: "You're at the closing stage. The merchant has agreed that Dual Pricing makes sense. Then they say: 'I love this, but my wife handles the finances. She'd kill me if I signed something without her.'",
    question: 'What do you do?',
    options: [
      { text: 'Ask them to bring the paperwork home and explain it to her', points: 3, feedback: "They'll probably never do it, and if they do, they can't answer her questions." },
      { text: 'Offer to schedule a follow-up when both can be present', points: 10, feedback: "This shows respect and gives you the best chance to close the actual decision-maker." },
      { text: 'Try to close them anyway—they can always cancel later', points: 0, feedback: "This is pushy and will likely result in cancellation or resentment." },
      { text: 'Ask if you can call his wife right now', points: 5, feedback: "Bold, but might come across as too aggressive. Better to schedule properly." }
    ],
    stage: 'Closing'
  },
  {
    id: 'scen-6',
    title: 'The Competitor Lowball',
    setup: "The merchant pulls out a quote from a competitor showing 1.5% processing. They say: 'Can you beat this?'",
    question: 'What do you do?',
    options: [
      { text: 'Try to match or beat the 1.5% rate', points: 2, feedback: "That rate is probably bait-and-switch. Don't race to the bottom." },
      { text: 'Ask to see the fine print and explain effective rate vs quoted rate', points: 10, feedback: "Perfect. Most lowball quotes have hidden fees that make the real cost higher." },
      { text: 'Say your service quality justifies a higher rate', points: 4, feedback: "Might work, but doesn't address their concern about the numbers." },
      { text: 'Walk away—you can\'t compete with that rate', points: 1, feedback: "Don't give up. That rate almost certainly has catches." }
    ],
    stage: 'Objection Handling'
  },
  {
    id: 'scen-7',
    title: 'The Busy Signal',
    setup: "You walk into a restaurant at 11:45 AM. The owner is prepping for lunch rush and says: 'Not a good time—we're about to get slammed.'",
    question: 'What do you do?',
    options: [
      { text: 'Ask for just 2 minutes of their time anyway', points: 2, feedback: "You'll annoy them and burn the relationship." },
      { text: 'Say "I completely understand. What time works better—after the lunch rush or tomorrow morning?"', points: 10, feedback: "Respect their time, offer specific alternatives, and come back prepared." },
      { text: 'Leave your card and hope they call', points: 3, feedback: "They won't call. But at least you didn't annoy them." },
      { text: 'Offer to help with lunch prep to build rapport', points: 5, feedback: "Creative, but might be seen as weird or intrusive." }
    ],
    stage: 'Opening'
  },
  {
    id: 'scen-8',
    title: 'The Perfect Customer',
    setup: "Everything is going great. The merchant loves Dual Pricing, understands the value, and is ready to sign. Then they ask: 'So what's your commission on this?'",
    question: 'What do you do?',
    options: [
      { text: 'Deflect and change the subject', points: 1, feedback: "This looks shady and can kill the deal at the last moment." },
      { text: 'Be honest and explain how you get paid, then tie it to their benefit', points: 10, feedback: "Transparency builds trust. 'I get paid when you save money—my incentive is your success.'" },
      { text: 'Say it\'s confidential company information', points: 2, feedback: "This sounds like you have something to hide." },
      { text: 'Minimize it and quickly move to paperwork', points: 4, feedback: "Rushing feels pushy. Address the question honestly." }
    ],
    stage: 'Closing'
  }
];

export const PRESENTATION_STAGES = [
  { id: 1, name: 'Visceral Opening', keywords: ['knot in your stomach', 'end of the month', 'deposit', 'not your fault', 'working for nothing', 'feel'] },
  { id: 2, name: 'Fee Quantification', keywords: ['three to four percent', '3 to 4 percent', 'every swipe', 'every transaction', 'adds up', 'effective rate', '$17,000', 'seventeen thousand'] },
  { id: 3, name: 'Marcus Story', keywords: ['Marcus', 'tire shop', 'Houston', 'taqueria', '$17,412', 'truck payment'] },
  { id: 4, name: 'Three Options', keywords: ['three options', 'interchange plus', 'surcharging', 'dual pricing', 'cash discount', 'absorb the fees'] },
  { id: 5, name: 'Customer Reaction', keywords: ['customer', 'customers', 'complain', '1 in 100', 'one in a hundred', 'choose how they pay'] },
  { id: 6, name: 'Social Proof', keywords: ['Mike', 'transformation', '40%', 'forty percent', 'other merchants', 'restaurants like yours'] },
  { id: 7, name: 'Process Explanation', keywords: ['simple', 'easy', 'we handle', 'install', 'training', 'support', '24/7'] },
  { id: 8, name: '90-Day Promise', keywords: ['90 days', 'ninety days', 'guarantee', 'no risk', 'cancel', 'walk away', 'no fees'] }
];
