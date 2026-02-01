import { storage } from "./storage";
import type { InsertPresentationModule, InsertPresentationLesson, InsertPresentationQuiz } from "@shared/schema";
import { db } from "./db";
import { presentationModules, presentationLessons, presentationQuizzes } from "@shared/schema";

const modulesData: InsertPresentationModule[] = [
  {
    moduleNumber: 1,
    title: "The Psychology Foundation",
    description: "Understand why this presentation works and the merchant's mental state. Learn the 8-video persuasion arc that transforms skeptical business owners into eager clients.",
  },
  {
    moduleNumber: 2,
    title: "Opening & Problem Awareness",
    description: "Master the visceral opening that bypasses logical evaluation and hits the amygdala directly. Learn fee quantification, the Marcus story, and identity activation.",
  },
  {
    moduleNumber: 3,
    title: "Solution Positioning",
    description: "Master the Three Options Framework that disqualifies competitors while positioning Dual Pricing as the only complete solution.",
  },
  {
    moduleNumber: 4,
    title: "Objection Prevention",
    description: "Learn to neutralize the customer reaction fear before it becomes an objection. Master social proof, time decay, and the math reframe.",
  },
  {
    moduleNumber: 5,
    title: "Story Proof & Transformation",
    description: "Tell Mike's story using the Hero's Journey structure. Master the Profit Flywheel concept and counterfactual fear.",
  },
  {
    moduleNumber: 6,
    title: "Process & Risk Reversal",
    description: "Remove friction with the Rosa story. Master the 90-Day Promise and authority/compliance elements.",
  },
  {
    moduleNumber: 7,
    title: "Solution Fit (Contextual)",
    description: "Match the right solution to each business type: in-store, mobile/field, and online/remote options.",
  },
  {
    moduleNumber: 8,
    title: "Close & Community",
    description: "Master values alignment, referral introduction, and the complete call-to-action that converts.",
  },
];

const lessonsData: { moduleNumber: number; lesson: Omit<InsertPresentationLesson, "moduleId"> }[] = [
  // Module 1: Psychology Foundation
  {
    moduleNumber: 1,
    lesson: {
      lessonNumber: 11,
      title: "Why This Presentation Works",
      videoId: "V1-V8",
      paragraphId: "Overview",
      mechanism: "Persuasion Architecture",
      scriptText: "The PCBancard Video Brochure Series operates as a closed-loop conversion system, not a collection of informational videos. Each video functions as a stage gate in a precise psychological journey: V1 → V2 → V3 → V4 → [V5/V6/V7] → V8. Problem → Vision → Process → Safety → Fit → Community.",
      psychology: "This presentation uses a systematic approach to belief installation. Each video installs specific beliefs that build upon the previous. By the time a merchant watches all videos, they have been guided through problem awareness, vision of transformation, process clarity, safety confirmation, solution fit, and community alignment.",
      timing: "Before any field work, understand this architecture. It will help you know exactly where each merchant is in their journey and what they need next.",
      commonMistakes: "Jumping to solution before establishing problem awareness. Rushing through videos without letting emotions land. Treating this as information delivery instead of belief installation.",
      practicePrompt: "In your own words, explain what makes this a 'conversion system' rather than just informational videos. What's the difference?",
    },
  },
  {
    moduleNumber: 1,
    lesson: {
      lessonNumber: 12,
      title: "The Merchant's Mental State",
      videoId: "V1",
      paragraphId: "V1.P1-P4",
      mechanism: "Identity Activation",
      scriptText: "Picture your actual day. It's 6 AM. Parking lot's still dark. You're already running through the list before your coffee's even warm. You're not here because you're excited. You're here because nothing happens unless you make it happen.",
      psychology: "This activates the merchant's identity as a hard-working business owner. Once identity is activated, actions must be consistent with that identity. The 6 AM scene creates visceral recognition - they've LIVED this exact moment. This bypasses skepticism because it's their own experience reflected back.",
      timing: "Use this type of identity activation early in any conversation. When a merchant feels truly SEEN, they open up.",
      commonMistakes: "Being too general ('business owners work hard'). Missing the specific details that create recognition. Delivering it in a salesy tone instead of empathetic understanding.",
      practicePrompt: "Describe a 6 AM moment for a restaurant owner vs. an auto shop owner. What specific details would make each feel recognized?",
    },
  },
  {
    moduleNumber: 1,
    lesson: {
      lessonNumber: 13,
      title: "The 8-Video Persuasion Arc",
      videoId: "V1-V8",
      paragraphId: "Overview",
      mechanism: "Sequential Belief Installation",
      scriptText: "V1: HELLO - Problem Awareness & Emotional Activation. V2: GROW - Story Proof & Compound Vision. V3: NEXT STEPS - Process Clarity + Risk Reversal. V4: TRUST - Credibility + Compliance Shield. V5: IN STORE - Counter/POS Solution Fit. V6: ON THE GO - Mobile/Field Solution Fit. V7: ONLINE - Remote/E-commerce Solution Fit. V8: COMMUNITY - Values Alignment + Referral.",
      psychology: "Each video installs specific beliefs that prepare the merchant for the next stage. V1 destabilizes (you're losing money), V2 provides vision (here's what's possible), V3 clarifies process (here's how easy it is), V4 provides safety (you can trust us), V5-7 confirm fit (we have your solution), V8 creates belonging (you're joining a community).",
      timing: "Know exactly which video(s) a merchant has watched. This tells you their current belief state and what they need next.",
      commonMistakes: "Not tracking which videos were watched. Assuming all merchants need the same conversation. Skipping videos in the sequence.",
      practicePrompt: "A merchant has only watched V1 and V2. What beliefs have been installed? What should your conversation focus on?",
    },
  },

  // Module 2: Opening & Problem Awareness
  {
    moduleNumber: 2,
    lesson: {
      lessonNumber: 21,
      title: "The Visceral Opening",
      videoId: "V1",
      paragraphId: "V1.P1",
      mechanism: "Loss Aversion Activation",
      scriptText: "Ever close the month—staring at the deposit screen, adding it up twice—and still feel that quiet knot in your stomach, like you worked another month for almost nothing? You're not imagining it. And it's not because you're doing something wrong. It's not your fault.",
      psychology: "This opening bypasses logical evaluation and hits the amygdala directly. 'Quiet knot' creates a visceral, physical sensation - not just intellectual understanding. 'Adding it up twice' is a specific detail that signals authenticity; the merchant has DONE this exact thing. 'Worked for almost nothing' frames the problem as injustice, not just inefficiency. Unfairness is more motivating than simple loss. Research basis: Kahneman's Prospect Theory shows losses feel 2x more painful than equivalent gains.",
      timing: "First 25 seconds of any presentation or conversation. Don't rush. Let the pause after 'almost nothing' land.",
      commonMistakes: "Rushing through it—the emotion needs time to land. Adding qualifiers like 'some owners feel...' Be direct. Jumping to solution before they sit in the problem. Flat delivery that doesn't match the weight of the words.",
      practicePrompt: "Record yourself delivering this opening. Focus on pace (slow, deliberate), the pause after 'almost nothing', and tone (empathetic, not salesy).",
    },
  },
  {
    moduleNumber: 2,
    lesson: {
      lessonNumber: 22,
      title: "Fee Quantification (Anchoring)",
      videoId: "V1",
      paragraphId: "V1.P2-P3",
      mechanism: "Anchoring + Tangible Asset Conversion",
      scriptText: "Every card you accept—dip, tap, swipe—three to four percent quietly comes off the top. On a forty-dollar ticket, that's a dollar twenty. A dollar sixty. Gone. Every single time. Do that a few hundred times a month? A few thousand? That can turn into ten, fifteen, even twenty-five thousand a year that never hits your account.",
      psychology: "We use specific numbers for maximum impact. '$17,412' is remembered when '$17,000' would be forgotten. Precision signals that we actually ran the math. The tangible conversion ('That's my truck payment') transforms abstract fees into a physical asset the merchant can visualize losing. This is anchoring—the first number heard influences all subsequent judgments.",
      timing: "Right after the emotional opening. The merchant is now feeling the problem—give them the math to make it concrete.",
      commonMistakes: "Using round numbers ('about $17,000'). Not converting to tangible assets. Letting the number just sit there without the emotional punch of what it represents.",
      practicePrompt: "When you run a merchant's numbers, use the EXACT figure. Practice saying '$847 per month' with the same weight as '$17,412 per year'.",
    },
  },
  {
    moduleNumber: 2,
    lesson: {
      lessonNumber: 23,
      title: "The Story Proof (Marcus)",
      videoId: "V1",
      paragraphId: "V1.P3",
      mechanism: "Narrative Transport + Dollar Anchoring",
      scriptText: "Marcus runs a tire shop outside Houston. When we showed him his number, he stopped mid-sentence. Rubbed the back of his neck, eyes on the floor, like he was feeling the weight of all those years he couldn't get back. His voice got quiet—the way it does when you're doing math you don't want to believe. Seventeen thousand four hundred twelve dollars a year. He leaned back and whispered, 'That's my truck payment. Every year. Just... gone.'",
      psychology: "Story absorption bypasses analytical resistance. The specific details (rubbed the back of his neck, eyes on the floor, voice got quiet) create a movie in the merchant's mind. They're not analyzing—they're EXPERIENCING. The pause before 'gone' creates emotional weight. The truck payment conversion makes abstract fees tangible and personal.",
      timing: "After establishing the fee math. The story makes the numbers personal and memorable.",
      commonMistakes: "Rushing through the physical details. Not pausing at emotional beats. Telling instead of showing. Making Marcus generic instead of specific.",
      practicePrompt: "Practice the Marcus story with full physical details. Feel the weight in 'Just... gone.' Time your pauses.",
    },
  },
  {
    moduleNumber: 2,
    lesson: {
      lessonNumber: 24,
      title: "Identity Activation (6 AM Scene)",
      videoId: "V1",
      paragraphId: "V1.P4",
      mechanism: "Identity Reinforcement",
      scriptText: "Now picture your actual day. It's 6 AM. Parking lot's still dark. You're already running through the list before your coffee's even warm. You're not here because you're excited. You're here because nothing happens unless you make it happen. By tonight, you'll have put out a dozen fires, solved problems your customers never see—and carried a few home you didn't talk about.",
      psychology: "This scene activates the merchant's identity as someone who sacrifices for their business. Once activated, any threat to that sacrifice (like processing fees stealing their earnings) becomes personal. The specific time (6 AM), physical details (dark parking lot, coffee), and emotional truth (carried problems home) create powerful recognition.",
      timing: "After the Marcus story. This expands from one merchant's experience to the universal business owner identity.",
      commonMistakes: "Being too general or generic. Missing the emotional truth of 'carried a few home you didn't talk about.' Rushing through without letting recognition land.",
      practicePrompt: "Describe the 6 AM moment for three different business types. What specific details create recognition for each?",
    },
  },

  // Module 3: Solution Positioning
  {
    moduleNumber: 3,
    lesson: {
      lessonNumber: 31,
      title: "Three Options Framework",
      videoId: "V1",
      paragraphId: "V1.P6-P9",
      mechanism: "Choice Architecture Setup",
      scriptText: "Three ways to stop this. The first is obvious. The second seems like it solves the problem—but doesn't. The third is the one most processors won't show you.",
      psychology: "This framework creates suspense and positions us as truth-tellers. By acknowledging Option 1 (interchange-plus) as legitimate for some businesses, we establish credibility. By exposing Option 2's fatal flaw (surcharging doesn't cover debit), we disqualify competitors. Option 3 becomes the only complete solution.",
      timing: "After the 6 AM scene. The merchant is now emotionally engaged and ready for solutions.",
      commonMistakes: "Rushing to Option 3 without establishing Options 1 and 2. Not explaining WHY surcharging falls short. Missing the 'most processors won't show you' intrigue.",
      practicePrompt: "Practice presenting all three options with appropriate pacing. Option 1 should feel 'okay', Option 2 should feel 'incomplete', Option 3 should feel 'complete'.",
    },
  },
  {
    moduleNumber: 3,
    lesson: {
      lessonNumber: 32,
      title: "Competitor Disqualification",
      videoId: "V1",
      paragraphId: "V1.P8",
      mechanism: "Competitor Disqualification",
      scriptText: "Option two: Add a fee to credit card transactions to cover your cost. It's called surcharging. And for some businesses, it works fine. But here's what most reps won't tell you: you can't surcharge debit cards. Federal law prohibits it. And for most businesses, debit is thirty to forty percent of transactions. Surcharging plugs part of the leak. Not all of it. The rest? You still pay it.",
      psychology: "We don't attack competitors directly—we expose a fundamental limitation they can't solve. 'Federal law prohibits it' is an immutable fact, not an opinion. The 30-40% statistic makes the gap concrete. The phrase 'most reps won't tell you' positions us as the honest ones.",
      timing: "When discussing Option 2. This must be delivered with calm confidence, not aggressive competitor bashing.",
      commonMistakes: "Sounding aggressive or bitter about competitors. Not emphasizing 'Federal law'. Forgetting to quantify the gap (30-40%).",
      practicePrompt: "Practice delivering this with calm, factual confidence. You're not attacking—you're educating.",
    },
  },
  {
    moduleNumber: 3,
    lesson: {
      lessonNumber: 33,
      title: "Dual Pricing as Complete Solution",
      videoId: "V1",
      paragraphId: "V1.P9",
      mechanism: "Solution Positioning",
      scriptText: "Option three: Stop paying the processing fee out of your margin entirely—on credit AND debit. With Dual Pricing—our dual pricing program—your customer sees the cash price and the card price, right on the screen, and picks. With dual pricing, you offer two prices: one for cash, one for cards. It's fully automated. The system does the math. Customers see both options and choose how they want to pay.",
      psychology: "After establishing that Options 1 and 2 have limitations, Option 3 solves EVERYTHING. 'Credit AND debit' directly addresses the fatal flaw of surcharging. 'Fully automated' removes complexity objections. 'The system does the math' removes merchant burden. 'Customers...choose' frames it as customer empowerment, not merchant extraction.",
      timing: "Immediately after exposing Option 2's flaw. The solution should feel like relief.",
      commonMistakes: "Not emphasizing 'credit AND debit'. Making it sound complicated. Forgetting the automation message.",
      practicePrompt: "Practice transitioning from Option 2's flaw directly into Option 3's solution. The contrast should feel dramatic.",
    },
  },

  // Module 4: Objection Prevention
  {
    moduleNumber: 4,
    lesson: {
      lessonNumber: 41,
      title: "The Customer Reaction Fear",
      videoId: "V1",
      paragraphId: "V1.P10",
      mechanism: "Social Friction Neutralization",
      scriptText: "Right about now, you're probably thinking: This sounds great on paper—but what happens when Mrs. Johnson sees two prices and gives me that look? If your first thought is, 'What will my customers think?'—good. That's the question every smart owner asks.",
      psychology: "We name the fear BEFORE the merchant voices it. This accomplishes three things: (1) We demonstrate we understand them deeply, (2) We normalize the fear ('every smart owner asks'), (3) We take control of addressing it on our terms. The 'Mrs. Johnson' detail makes the fear specific and addressable rather than vague and overwhelming.",
      timing: "Immediately after presenting Dual Pricing. Anticipate the objection before it forms.",
      commonMistakes: "Waiting for the merchant to voice the objection. Being defensive about the concern. Not normalizing it ('every smart owner asks').",
      practicePrompt: "Practice naming this fear with genuine empathy. The merchant should feel understood, not sold to.",
    },
  },
  {
    moduleNumber: 4,
    lesson: {
      lessonNumber: 42,
      title: "Social Proof & Time Decay",
      videoId: "V1",
      paragraphId: "V1.P10",
      mechanism: "Social Proof + Time Decay",
      scriptText: "Marcus asked it too, before he switched. First week, he braced for complaints. By week three, he stopped thinking about it. Here's what actually happens: people still buy what they came to buy. They see two prices—cash or card—and they pick. Most don't mention it.",
      psychology: "Marcus provides peer proof—someone just like them had the same fear and it resolved quickly. 'First week...week three' shows rapid decay of the problem. 'People still buy what they came to buy' reframes from 'will I lose customers' to 'customers do what customers do.' 'Most don't mention it' is the real-world truth that dissolves the fear.",
      timing: "Immediately after naming the customer reaction fear.",
      commonMistakes: "Skipping the time decay element. Not being specific about the timeline. Arguing instead of sharing experience.",
      practicePrompt: "Practice the 'first week...week three' transition. The fear should feel temporary and manageable.",
    },
  },
  {
    moduleNumber: 4,
    lesson: {
      lessonNumber: 43,
      title: "The Math Reframe (1 in 100)",
      videoId: "V1",
      paragraphId: "V1.P11",
      mechanism: "Risk Reframe",
      scriptText: "Here's the math most owners run in their head: if I lose one customer out of twenty because of the price difference—does that wipe out my savings? For most businesses, the answer is no. You'd have to lose closer to one in four just to break even. In the real world, it's closer to one in a hundred. And that customer probably wasn't profitable for you to begin with.",
      psychology: "We directly address the mental math they're doing. The progression from '1 in 20' (their fear) to '1 in 4' (break-even reality) to '1 in 100' (actual experience) systematically reduces the perceived risk. The final line ('probably wasn't profitable') reframes any potential loss as acceptable.",
      timing: "After social proof. This provides the logical backup for the emotional reassurance.",
      commonMistakes: "Skipping the math entirely. Not walking through the progression. Forgetting the 'wasn't profitable' reframe.",
      practicePrompt: "Practice walking through this math progression clearly. Each number should land before moving to the next.",
    },
  },

  // Module 5: Story Proof & Transformation
  {
    moduleNumber: 5,
    lesson: {
      lessonNumber: 51,
      title: "Hero's Journey Structure",
      videoId: "V2",
      paragraphId: "V2.P6-P8",
      mechanism: "Narrative Transport + Identity Mirroring",
      scriptText: "Mike owns a repair shop outside Austin. The kind where the guy answering the phone is the same guy under the hood. He poured everything into that place—sixteen-hour days, missed weekends, a truck that doubled as his office. Like most service businesses, most of his revenue came in on cards.",
      psychology: "Mike's story follows the Hero's Journey: Ordinary World (struggling shop owner), Call to Adventure (meeting us), Transformation (the Profit Flywheel), Return (thriving business). The specific details ('truck that doubled as his office') create recognition. The merchant sees themselves in Mike's struggle.",
      timing: "V2 is dedicated to Mike's full story. Use pieces of it throughout your conversations.",
      commonMistakes: "Summarizing instead of storytelling. Missing the specific physical details. Rushing through the struggle phase.",
      practicePrompt: "Practice Mike's introduction with full sensory details. Make the merchant SEE that truck, FEEL those sixteen-hour days.",
    },
  },
  {
    moduleNumber: 5,
    lesson: {
      lessonNumber: 52,
      title: "The Profit Flywheel Concept",
      videoId: "V2",
      paragraphId: "V2.P14-P19",
      mechanism: "Conceptual Reframe (Cost to Investment)",
      scriptText: "Eliminating a fee is nice. Reinvesting it is powerful. We call it the Profit Flywheel—because once it starts spinning, it doesn't stop. The margin that used to disappear becomes the fuel that powers your growth.",
      psychology: "This reframes saved fees from 'discount' to 'investment budget.' The flywheel metaphor suggests perpetual motion—once started, it compounds. This transforms the decision from 'save money' to 'grow business.' The specific Year 1-3 breakdown (marketing → tech → people → freedom) makes growth tangible.",
      timing: "After establishing how much they're losing. The flywheel shows what they could DO with that money.",
      commonMistakes: "Treating savings as the end goal. Not painting the reinvestment picture. Missing the compound growth element.",
      practicePrompt: "Practice explaining the flywheel with specific examples for different business types. What would a restaurant reinvest in vs. an auto shop?",
    },
  },
  {
    moduleNumber: 5,
    lesson: {
      lessonNumber: 53,
      title: "Counterfactual Fear",
      videoId: "V2",
      paragraphId: "V2.P22-P23",
      mechanism: "Fear of Inaction",
      scriptText: "Now picture the other version. The one where nothing changes. Where that thirteen thousand keeps walking out the door. Where Lisa—your best tech, the one who actually shows up—finally takes the shop across town's offer because you couldn't match the raise. Where the diagnostic tool stays in the catalog. Where Saturdays stay closed because you just can't do it alone anymore.",
      psychology: "Counterfactual thinking is one of the most powerful motivators. We paint a vivid picture of the 'other version'—the future where they don't act. The specific losses (Lisa leaving, tool staying in catalog, Saturdays closed) make inaction feel costly. This creates urgency without being pushy.",
      timing: "After the positive flywheel vision. The contrast between futures creates decision pressure.",
      commonMistakes: "Being too dramatic or scary. Not making it specific to their situation. Rushing through without letting each loss land.",
      practicePrompt: "Practice painting the 'other version' for a specific business type. Make each loss feel real and personal.",
    },
  },

  // Module 6: Process & Risk Reversal
  {
    moduleNumber: 6,
    lesson: {
      lessonNumber: 61,
      title: "Friction Removal",
      videoId: "V3",
      paragraphId: "V3.P1-P5",
      mechanism: "Process Clarity",
      scriptText: "Here's how this works—and more importantly, what you DON'T have to do. You don't have to understand interchange. You don't have to read your current contract. You don't have to cancel anything before we start. You don't even have to make a decision today.",
      psychology: "Every 'you don't have to' removes a friction point. Merchants expect complexity—we deliver simplicity. The pattern creates relief with each statement. 'Don't have to make a decision today' removes the pressure they're bracing for.",
      timing: "V3 is dedicated to process clarity. Use this when merchants seem hesitant about 'how it works.'",
      commonMistakes: "Jumping straight to what they DO have to do. Not emphasizing the simplicity. Missing the 'no decision today' pressure release.",
      practicePrompt: "Practice the 'you don't have to' sequence with appropriate pauses. Each statement should land as relief.",
    },
  },
  {
    moduleNumber: 6,
    lesson: {
      lessonNumber: 62,
      title: "The 90-Day Promise",
      videoId: "V2-V3",
      paragraphId: "V2.P25-P26",
      mechanism: "Risk Reversal",
      scriptText: "For years, you've taken the risk alone. Equipment that didn't work right. Processors that raised rates. Sales reps who disappeared. Now the pressure is on us. For ninety days, if the numbers don't work—if your customers push back more than expected—if you just don't like how it feels—we reverse everything. No penalty. No hard feelings. No 'gotcha' in the fine print.",
      psychology: "This is classic risk reversal—we take the risk, not them. The list of past disappointments (equipment, rate raises, disappearing reps) validates their skepticism. 'Pressure is on us' explicitly shifts burden. The triple 'no' (no penalty, no hard feelings, no gotcha) addresses every flavor of risk concern.",
      timing: "When merchants express hesitation about commitment or past bad experiences.",
      commonMistakes: "Burying the 90-day promise in other information. Not acknowledging past disappointments. Making it sound like standard fine print.",
      practicePrompt: "Practice delivering the 90-Day Promise as a genuine commitment, not a sales tactic. Feel the weight of 'pressure is on us.'",
    },
  },
  {
    moduleNumber: 6,
    lesson: {
      lessonNumber: 63,
      title: "Authority & Compliance",
      videoId: "V4",
      paragraphId: "V4.P1-P12",
      mechanism: "Credibility + Compliance Shield",
      scriptText: "Everything we do follows card brand rules. Visa, Mastercard, Discover, Amex—they all have specific requirements for dual pricing. We handle every disclosure, every receipt format, every signage requirement. You don't have to figure out what's legal. That's literally our job.",
      psychology: "Authority symbols (card brand names) provide legitimacy. 'Every disclosure, every receipt format, every signage requirement' demonstrates deep expertise. 'That's literally our job' removes the burden of compliance from them.",
      timing: "V4 is dedicated to trust and compliance. Use when merchants worry about legality or proper setup.",
      commonMistakes: "Being vague about compliance. Not naming specific card brands. Making compliance sound like their responsibility.",
      practicePrompt: "Practice listing compliance elements with confidence. You should sound like the expert who has done this hundreds of times.",
    },
  },

  // Module 7: Solution Fit
  {
    moduleNumber: 7,
    lesson: {
      lessonNumber: 71,
      title: "In-Store Solutions",
      videoId: "V5",
      paragraphId: "V5.P1-P10",
      mechanism: "Solution Fit Confirmation",
      scriptText: "For counter service—restaurants, salons, retail—you need customers to see both prices clearly and choose quickly. Our terminals display the cash price and card price side by side. The customer taps their choice. Done in two seconds. No confusion, no explanation needed.",
      psychology: "This addresses the practical 'how would it work in MY business' question. Specific use cases (restaurants, salons, retail) create recognition. 'Done in two seconds' removes complexity concerns. 'No explanation needed' addresses the fear of awkward conversations.",
      timing: "After establishing the concept works. This shows HOW it works in their specific environment.",
      commonMistakes: "Being too generic. Not matching to their specific business type. Forgetting to address the 'explanation' concern.",
      practicePrompt: "Practice describing the terminal experience for a salon owner, then a restaurant owner. What specific details matter to each?",
    },
  },
  {
    moduleNumber: 7,
    lesson: {
      lessonNumber: 72,
      title: "Mobile/Field Solutions",
      videoId: "V6",
      paragraphId: "V6.P1-P11",
      mechanism: "Mobile Solution Fit",
      scriptText: "If you're in the field—plumbers, electricians, landscapers, mobile services—you need it to work on your phone or tablet. Our mobile system shows both prices on your device. Customer sees the options, taps to pay, gets their receipt by text. No bulky equipment to carry.",
      psychology: "Field service businesses have unique needs—portability and speed. 'No bulky equipment' addresses a real pain point. 'Receipt by text' shows we understand modern customer expectations. The specific trades mentioned create recognition.",
      timing: "When talking to any mobile or field service business.",
      commonMistakes: "Using counter/terminal language with field service businesses. Not emphasizing portability. Forgetting the receipt delivery detail.",
      practicePrompt: "Practice the mobile pitch for a plumber vs. a landscaper. What specific moments in their day would they use this?",
    },
  },
  {
    moduleNumber: 7,
    lesson: {
      lessonNumber: 73,
      title: "Online/Remote Solutions",
      videoId: "V7",
      paragraphId: "V7.P1-P11",
      mechanism: "E-commerce Solution Fit",
      scriptText: "For online sales or invoicing—coaches, consultants, e-commerce, professional services—dual pricing works through your website or invoice system. Customer sees both prices when they click to pay. They choose cash (bank transfer) or card. Simple checkout, same savings.",
      psychology: "Online businesses often think dual pricing is only for physical retail. This expands their understanding. 'Bank transfer' translates 'cash price' to the digital context. 'Same savings' connects back to the core value proposition.",
      timing: "When talking to any business that takes payments online or sends invoices.",
      commonMistakes: "Assuming online businesses won't qualify. Not translating 'cash' to 'bank transfer'. Forgetting that invoicing counts as online.",
      practicePrompt: "Practice explaining dual pricing for an online coaching business. How does the 'cash option' work when there's no physical cash?",
    },
  },

  // Module 8: Close & Community
  {
    moduleNumber: 8,
    lesson: {
      lessonNumber: 81,
      title: "Values Alignment",
      videoId: "V8",
      paragraphId: "V8.P1-P5",
      mechanism: "Values Alignment",
      scriptText: "We're not just about saving money. We believe in local business. In owners who show up before sunrise and lock up after dark. In the shops and restaurants that make neighborhoods feel like neighborhoods. When you succeed, we succeed. That's not a tagline—it's how we built this company.",
      psychology: "This moves beyond transactional value to shared values. 'Before sunrise...after dark' callbacks the 6 AM identity activation. 'Make neighborhoods feel like neighborhoods' connects to community pride. 'Not a tagline' preempts skepticism about corporate speak.",
      timing: "V8 is the closing video. Use values alignment when merchants are considering but not yet committed.",
      commonMistakes: "Making it sound like marketing speak. Not connecting to earlier identity elements. Rushing through to the close.",
      practicePrompt: "Practice delivering the values message with genuine belief. If you don't believe it, they won't either.",
    },
  },
  {
    moduleNumber: 8,
    lesson: {
      lessonNumber: 82,
      title: "Referral Introduction",
      videoId: "V8",
      paragraphId: "V8.P6-P8",
      mechanism: "Referral Seeding",
      scriptText: "Once you see the difference—once that money is staying in your account instead of walking out the door—you'll probably think of someone else who needs to know. A friend who owns a shop down the street. A brother-in-law with a food truck. That's how most of our merchants find us. Word of mouth from people who tried it.",
      psychology: "This plants the referral seed BEFORE they've even signed up. 'Once you see the difference' assumes success. Specific referral targets (friend with shop, brother-in-law with food truck) make it concrete. 'Word of mouth' establishes this as normal behavior.",
      timing: "Near the end of the conversation or in V8. Plant the seed early.",
      commonMistakes: "Asking for referrals too directly or too early. Not making the referral targets specific. Forgetting to assume their success.",
      practicePrompt: "Practice the referral plant naturally. It should feel like a prediction, not a request.",
    },
  },
  {
    moduleNumber: 8,
    lesson: {
      lessonNumber: 83,
      title: "The Complete CTA",
      videoId: "V8",
      paragraphId: "V8.P9-P10",
      mechanism: "Action Prompt",
      scriptText: "Your local rep will be back to show you exactly what you're paying now—and what changes. Takes about ten minutes. If it doesn't make sense for your business, we'll tell you. Either way, you'll leave with your numbers, your options, and a clear next step.",
      psychology: "The CTA is specific (ten minutes), low-risk (we'll tell you if it doesn't fit), and value-guaranteed (you'll leave with your numbers regardless). 'Clear next step' removes decision paralysis. The rep visit is positioned as informational, not sales pressure.",
      timing: "The closing of V1 and V8. This is the specific action we want them to take.",
      commonMistakes: "Making the commitment feel bigger than it is. Not guaranteeing value regardless of decision. Forgetting the 'we'll tell you if it doesn't fit' safety valve.",
      practicePrompt: "Practice the CTA with calm confidence. You're offering them clarity, not pressuring them into anything.",
    },
  },
];

const quizzesData: { lessonNumber: number; quizzes: Omit<InsertPresentationQuiz, "lessonId">[] }[] = [
  {
    lessonNumber: 21,
    quizzes: [
      {
        question: "What is the primary psychological mechanism used in the visceral opening?",
        options: ["Social Proof", "Loss Aversion Activation", "Authority Bias", "Scarcity"],
        correctIndex: 1,
        explanation: "The visceral opening activates loss aversion by making merchants FEEL the money they're losing before presenting any solution. Kahneman's research shows losses feel 2x more painful than equivalent gains.",
      },
      {
        question: "Why do we use 'quiet knot in your stomach' instead of 'you're losing money'?",
        options: ["It sounds more professional", "It creates a physical, visceral sensation rather than just intellectual understanding", "It's shorter", "It avoids talking about money directly"],
        correctIndex: 1,
        explanation: "Visceral language bypasses logical analysis and creates felt experience. The merchant doesn't just understand the problem—they FEEL it in their body.",
      },
    ],
  },
  {
    lessonNumber: 22,
    quizzes: [
      {
        question: "Why do we say '$17,412' instead of 'about $17,000'?",
        options: ["It's more accurate", "Specific numbers feel calculated and create memorability", "It's required by compliance", "Round numbers are too simple"],
        correctIndex: 1,
        explanation: "Precision serves multiple purposes: it signals credibility ('they actually ran the math'), odd numbers stick in memory better than round ones, and specific amounts feel more real and personal.",
      },
    ],
  },
  {
    lessonNumber: 32,
    quizzes: [
      {
        question: "Why do we mention 'Federal law prohibits' surcharging debit cards?",
        options: ["To scare the merchant", "To establish an immutable fact that competitors cannot solve", "To seem more knowledgeable", "It's required disclosure"],
        correctIndex: 1,
        explanation: "By citing federal law, we're not attacking competitors—we're exposing a fundamental limitation they cannot overcome. It's an immutable fact, not an opinion, which makes it more persuasive.",
      },
    ],
  },
  {
    lessonNumber: 41,
    quizzes: [
      {
        question: "Why do we name the 'Mrs. Johnson' objection BEFORE the merchant voices it?",
        options: ["To seem psychic", "To demonstrate deep understanding and take control of addressing it on our terms", "To make them feel bad", "It's just a storytelling technique"],
        correctIndex: 1,
        explanation: "Naming the fear first shows we understand them deeply, normalizes the concern ('every smart owner asks'), and lets us address it on our terms before it becomes a hardened objection.",
      },
    ],
  },
  {
    lessonNumber: 52,
    quizzes: [
      {
        question: "What's the difference between treating saved fees as a 'discount' vs. an 'investment budget'?",
        options: ["No real difference", "Investment budget suggests perpetual growth and compound returns, not just one-time savings", "Discount sounds cheaper", "Investment budget is more formal"],
        correctIndex: 1,
        explanation: "The Profit Flywheel reframes saved fees from a one-time discount to ongoing investment fuel. This transforms the decision from 'save money' to 'grow business'—a much more compelling vision.",
      },
    ],
  },
];

export async function seedPresentationContent(): Promise<void> {
  console.log("Checking if presentation training content needs to be seeded...");
  
  const existingModules = await storage.getPresentationModules();
  if (existingModules.length > 0) {
    console.log(`Presentation training content already exists (${existingModules.length} modules). Skipping seed.`);
    return;
  }

  console.log("Starting presentation training content seed...");

  // Insert modules
  const insertedModules = await db.insert(presentationModules).values(modulesData as any).returning();
  console.log(`Inserted ${insertedModules.length} modules`);

  // Create module lookup by number
  const moduleLookup = new Map<number, number>();
  for (const mod of insertedModules) {
    moduleLookup.set(mod.moduleNumber, mod.id);
  }

  // Insert lessons
  const lessonsToInsert = lessonsData.map(({ moduleNumber, lesson }) => ({
    ...lesson,
    moduleId: moduleLookup.get(moduleNumber)!,
  }));

  const insertedLessons = await db.insert(presentationLessons).values(lessonsToInsert as any).returning();
  console.log(`Inserted ${insertedLessons.length} lessons`);

  // Create lesson lookup by number
  const lessonLookup = new Map<number, number>();
  for (const lesson of insertedLessons) {
    lessonLookup.set(lesson.lessonNumber, lesson.id);
  }

  // Insert quizzes
  let quizCount = 0;
  for (const { lessonNumber, quizzes } of quizzesData) {
    const lessonId = lessonLookup.get(lessonNumber);
    if (lessonId) {
      const quizzesToInsert = quizzes.map((q) => ({
        ...q,
        lessonId,
      }));
      await db.insert(presentationQuizzes).values(quizzesToInsert as any);
      quizCount += quizzesToInsert.length;
    }
  }
  console.log(`Inserted ${quizCount} quiz questions`);

  console.log("[Presentation Training] Seed complete!");
}
