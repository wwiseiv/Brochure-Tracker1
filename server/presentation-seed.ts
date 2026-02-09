import { db } from "./db";
import { and, eq } from "drizzle-orm";
import { presentationModules, presentationLessons, presentationQuizzes } from "@shared/schema";
import type { InsertPresentationModule, InsertPresentationLesson, InsertPresentationQuiz } from "@shared/schema";

const modulesData: InsertPresentationModule[] = [
  {
    moduleNumber: 1,
    title: "The Psychology Foundation",
    description: "Understand WHY this presentation works before learning WHAT to say. Master the merchant's mental state and the persuasion architecture.",
  },
  {
    moduleNumber: 2,
    title: "Opening & Problem Awareness",
    description: "Master the visceral opening, fee quantification, and identity activation. Make the merchant FEEL the problem before you offer any solution.",
  },
  {
    moduleNumber: 3,
    title: "Solution Positioning",
    description: "Present the three options framework that makes Dual Pricing the obvious choice. Learn to position competitors without attacking them.",
  },
  {
    moduleNumber: 4,
    title: "Objection Prevention",
    description: "Handle objections before they form. Master the customer reaction fear, social proof, and the math reframe.",
  },
  {
    moduleNumber: 5,
    title: "Story, Proof, and Transformation",
    description: "Master Mike's transformation story and the Profit Flywheel concept. Learn to paint vision and prevent status quo through counterfactual fear.",
  },
  {
    moduleNumber: 6,
    title: "Process & Risk Reversal",
    description: "Remove friction with clear process explanation. Master the 90-Day Promise and authority/compliance elements that make commitment feel safe.",
  },
  {
    moduleNumber: 7,
    title: "Solution Fit (Contextual)",
    description: "Match the right solution to each business type: in-store countertop, mobile/field service, and online/remote payment options.",
  },
  {
    moduleNumber: 8,
    title: "Closing & Community",
    description: "Master values alignment, referral introduction, and the complete call-to-action that converts presentations into signed merchants.",
  },
];

interface LessonData {
  moduleNumber: number;
  lesson: Omit<InsertPresentationLesson, "moduleId">;
  quizzes: Array<{
    question: string;
    type: string;
    options?: string[];
    correctAnswer: number | string;
    explanation: string;
  }>;
}

const lessonsData: LessonData[] = [
  // ============================================================================
  // MODULE 1: PSYCHOLOGY FOUNDATION
  // ============================================================================
  {
    moduleNumber: 1,
    lesson: {
      lessonNumber: 11,
      title: "Why This Presentation Works",
      scriptText: `This isn't a pitch. It's a guided discovery.

The presentation works because it mirrors how people actually make decisions. First, you have to feel the problem. Then you need to see options. Then you need proof it works. Then you need to feel safe trying it.

Skip any step and the whole thing falls apart. Rush the problem and they don't feel urgency. Skip the proof and they don't believe you. Miss the safety and they won't sign.

Every line has a job. Every pause has a purpose. When you understand the architecture, you stop memorizing scripts and start having conversations.`,
      practicePrompt: "Understand the core psychological principles that make this presentation effective. Learn why the sequence matters and how each piece builds on the last.",
      keyQuestions: [
        "Before we get into details—what's the biggest headache you deal with every month when it comes to processing?",
        "When you look at your statement, what jumps out at you?",
        "Have you ever added up what you pay in fees over a full year?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They've heard pitches before. They're skeptical. They need to feel like they discovered the problem themselves, not that you sold it to them.",
        commonMistake: "Jumping straight to the solution. Reps want to talk about Dual Pricing immediately because they're excited about it.",
        howPhrasingPreventsResistance: "By framing this as a 'guided discovery' rather than a pitch, you position yourself as a consultant, not a salesperson. The merchant feels in control.",
        skipConsequence: "If you don't establish the problem first, every benefit you mention sounds like hype. They have no frame of reference for why it matters."
      },
      practiceDrill: {
        title: "Foundation Warm-Up",
        duration: "3 minutes",
        steps: [
          "Stand in front of a mirror or record yourself",
          "Deliver the opening 60 seconds without mentioning Dual Pricing or any solution",
          "Focus entirely on making the merchant feel the problem",
          "Time yourself—if you mention a solution before 60 seconds, restart"
        ],
        roleplayPrompt: "You are a skeptical restaurant owner who has been burned by payment reps before. I will open without pitching. Push back if I mention any solution in the first minute.",
        badExample: "Hi, I'm here to tell you about our amazing Dual Pricing program that can save you thousands!",
        goodExample: "Ever close the month, stare at your deposit screen, add it up twice—and still feel that knot in your stomach? Like you worked another month for almost nothing?",
        aiCoachingPrompt: "You are the merchant. I will deliver my opening. Do NOT let me talk about any solution for the first 60 seconds. If I mention Dual Pricing, savings, or any product, interrupt me and say 'You're pitching already—I don't trust pitches.' Score me 1-10 on problem establishment."
      },
      psychologyTag: "Guided Discovery Architecture",
      whenToUse: "At the beginning of every presentation, before any product discussion.",
      commonMistakes: "Starting with features instead of problems. Talking more than listening in the first 5 minutes. Not letting the merchant articulate their own frustration.",
      mechanism: "Persuasion Architecture",
    },
    quizzes: [
      {
        question: "What is the PRIMARY goal of the first 60 seconds of your presentation?",
        type: "multiple_choice",
        options: [
          "Explain Dual Pricing features",
          "Make the merchant feel the problem",
          "Show your credentials",
          "Ask for their statement"
        ],
        correctAnswer: 1,
        explanation: "The first 60 seconds must establish emotional connection to the problem. Features mean nothing if they don't feel the pain first."
      },
      {
        question: "Why is the presentation structured as a 'guided discovery' rather than a pitch?",
        type: "multiple_choice",
        options: [
          "It takes less time",
          "It's easier to memorize",
          "The merchant feels in control and discovers the solution themselves",
          "It avoids compliance issues"
        ],
        correctAnswer: 2,
        explanation: "When merchants discover the problem and solution themselves, they own the decision. Pitches create resistance; discovery creates buy-in."
      },
      {
        question: "What happens if you mention the solution before establishing the problem?",
        type: "multiple_choice",
        options: [
          "Nothing—merchants appreciate efficiency",
          "Every benefit sounds like hype because there's no frame of reference",
          "They'll ask more questions",
          "It shortens the sales cycle"
        ],
        correctAnswer: 1,
        explanation: "Without a problem frame, solutions sound like empty promises. The problem creates the container that gives benefits meaning."
      },
      {
        question: "SCENARIO: A merchant says 'Just tell me what you're selling.' What do you do?",
        type: "multiple_choice",
        options: [
          "Immediately explain Dual Pricing to respect their time",
          "Say 'I'm not selling anything' and continue with problem questions",
          "Acknowledge their directness, then ask one problem question before explaining",
          "Leave because they're not a good fit"
        ],
        correctAnswer: 2,
        explanation: "Honor their directness but don't abandon the process. 'Fair enough—let me ask you one thing first: when you look at what you pay in processing, does that number frustrate you?' Then bridge to the explanation."
      }
    ]
  },
  {
    moduleNumber: 1,
    lesson: {
      lessonNumber: 12,
      title: "The Merchant's Mental State",
      scriptText: `Before you walk in, here's what's happening in their head:

'Another rep. Another pitch. What's the catch this time?'

They've been burned. Maybe a hidden fee that showed up on month three. Maybe a contract they couldn't escape. Maybe promises that never materialized.

Your job isn't to overcome this. Your job is to acknowledge it exists. When you name what they're feeling before they say it, something shifts. They stop defending and start listening.

By the end of a good presentation, they should feel three things: Understood. Informed. Safe to try.`,
      practicePrompt: "Understand what the merchant is thinking and feeling before, during, and after your presentation. Map their emotional journey so you can guide it effectively.",
      keyQuestions: [
        "You've probably heard pitches like this before—what's made you skeptical?",
        "What would need to be true for you to actually consider switching?",
        "What's the worst experience you've had with a payment rep?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "Defensive, skeptical, time-pressured. They assume you're like every other rep who promised things and underdelivered.",
        commonMistake: "Ignoring or trying to overcome their skepticism with enthusiasm. 'But we're different!' actually increases resistance.",
        howPhrasingPreventsResistance: "Naming their skepticism out loud ('You've probably heard pitches like this before') validates their experience and separates you from other reps.",
        skipConsequence: "They stay in defensive mode the entire presentation. Even good information bounces off because they're filtering for the catch."
      },
      practiceDrill: {
        title: "Skepticism Naming Drill",
        duration: "2 minutes",
        steps: [
          "Practice saying: 'You've probably heard pitches like this before.'",
          "Follow with: 'What's made you skeptical?'",
          "Then stay silent for at least 5 seconds",
          "Do NOT defend or explain—just listen"
        ],
        roleplayPrompt: "You are a merchant with arms crossed. You've been burned by a processing company before. When the rep acknowledges your skepticism, open up slightly. If they get defensive, shut down completely.",
        badExample: "I know you might be skeptical, but we're really different! Let me tell you why...",
        goodExample: "You've probably heard pitches like this before. I'm curious—what's made you skeptical?",
        aiCoachingPrompt: "You are a skeptical merchant. I will attempt to acknowledge your skepticism. If I do it with genuine curiosity, open up and share a past bad experience. If I do it defensively or immediately pivot to selling, cross your arms and give short answers. Score me 1-10 on empathy and restraint."
      },
      psychologyTag: "Empathy Mapping",
      whenToUse: "Early in the presentation when you sense skepticism or closed body language.",
      commonMistakes: "Being overly positive and ignoring their skepticism. Getting defensive when they express doubt. Trying to 'overcome' objections instead of acknowledge them.",
      mechanism: "Identity Activation",
    },
    quizzes: [
      {
        question: "What is the merchant typically feeling when you walk in?",
        type: "multiple_choice",
        options: [
          "Excited to hear about new solutions",
          "Defensive, skeptical, and time-pressured",
          "Neutral and open-minded",
          "Eager to switch processors"
        ],
        correctAnswer: 1,
        explanation: "Most merchants have been burned before. Assume skepticism until proven otherwise."
      },
      {
        question: "What's wrong with saying 'But we're different!' when a merchant expresses skepticism?",
        type: "multiple_choice",
        options: [
          "It's too casual",
          "It increases resistance because every rep says that",
          "It's against compliance",
          "Nothing—it's an effective response"
        ],
        correctAnswer: 1,
        explanation: "Every rep claims to be different. The phrase has lost all meaning and actually triggers more skepticism."
      },
      {
        question: "What should you do after asking 'What's made you skeptical?'",
        type: "multiple_choice",
        options: [
          "Immediately explain how you're different",
          "Stay silent and listen for at least 5 seconds",
          "Hand them a brochure",
          "Ask another question"
        ],
        correctAnswer: 1,
        explanation: "Silence creates space for them to share. Filling the silence with your own words destroys the moment."
      },
      {
        question: "SCENARIO: A merchant says 'Every rep promises savings and it never happens.' What's your response?",
        type: "multiple_choice",
        options: [
          "'Our savings are guaranteed!'",
          "'I understand. What happened with your last processor?'",
          "'We're not like other companies.'",
          "'Would you like to see our testimonials?'"
        ],
        correctAnswer: 1,
        explanation: "Curiosity about their experience validates their feelings and opens a real conversation. Claims and proof can come later."
      }
    ]
  },
  {
    moduleNumber: 1,
    lesson: {
      lessonNumber: 13,
      title: "The 8-Video Persuasion Arc",
      scriptText: `The presentation follows eight stages. Each one has a specific job:

ONE: Problem Awareness. Make them feel the leak.
TWO: Story Proof. Show them someone like them who fixed it.
THREE: Process. Remove friction and fear.
FOUR: Trust. Handle 'what's the catch?' before they ask.
FIVE through SEVEN: Solution Fit. Match the right setup to their business.
EIGHT: Community. Align values and open the referral door.

Skip a step, and you break the chain. Go out of order, and it feels like a pitch instead of a conversation.

The art is knowing when to linger and when to move. Some merchants need more time on Problem. Some need more on Trust. Your job is to read the room.`,
      practicePrompt: "Understand the complete presentation architecture. Learn how each section builds on the previous one and why the sequence matters.",
      keyQuestions: [
        "Which of these areas feels most relevant to where you are right now?",
        "Is there anything we've covered that you want to go deeper on?",
        "What would help you feel confident moving forward?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They don't know they're being guided through a sequence. They just feel like the conversation makes sense.",
        commonMistake: "Jumping to Solution Fit before establishing Trust. Or skipping Story Proof because 'they don't need convincing.'",
        howPhrasingPreventsResistance: "The sequence mirrors natural decision-making: Problem → Vision → Safety → Fit → Commitment. It feels organic, not scripted.",
        skipConsequence: "Skipping steps creates gaps. Gaps create objections. Objections create stalls. The full sequence prevents most objections before they form."
      },
      practiceDrill: {
        title: "Sequence Memorization",
        duration: "3 minutes",
        steps: [
          "Write the 8 stages on paper from memory",
          "Next to each, write one sentence about its job",
          "Practice reciting them aloud",
          "Quiz yourself: 'What comes after Trust?'"
        ],
        roleplayPrompt: "Ask me what step comes next at random points. I need to be able to name the step and its purpose instantly.",
        badExample: "Let me tell you about our equipment options... [jumping to Solution Fit before establishing Problem or Trust]",
        goodExample: "Before we look at which setup fits your counter, let me show you who stands behind this...",
        aiCoachingPrompt: "Quiz me on the 8-stage sequence. Ask 'What comes after X?' and 'What is the job of stage Y?' Give me 10 questions rapidly. Score me on speed and accuracy."
      },
      psychologyTag: "Persuasion Architecture",
      whenToUse: "As your internal navigation throughout the entire presentation.",
      commonMistakes: "Rushing through steps because the merchant seems interested. Skipping Trust because they're friendly. Going straight to pricing before Problem and Proof.",
      mechanism: "Sequential Belief Installation",
    },
    quizzes: [
      {
        question: "What is the job of Stage 1 (Problem Awareness)?",
        type: "multiple_choice",
        options: [
          "Explain Dual Pricing features",
          "Make them feel the leak",
          "Ask for their statement",
          "Build rapport"
        ],
        correctAnswer: 1,
        explanation: "Stage 1 is about emotional activation—making the fee leak visceral, not abstract."
      },
      {
        question: "Which stage comes immediately after Story Proof?",
        type: "multiple_choice",
        options: [
          "Problem Awareness",
          "Trust",
          "Process",
          "Solution Fit"
        ],
        correctAnswer: 2,
        explanation: "After seeing proof it works (Story), they need to know what happens next (Process). Trust follows Process."
      },
      {
        question: "Why do stages 5-7 all cover 'Solution Fit'?",
        type: "multiple_choice",
        options: [
          "To give you three chances to close",
          "Because different businesses have different needs (In Store, On The Go, Online)",
          "They're backup content if the conversation stalls",
          "For compliance reasons"
        ],
        correctAnswer: 1,
        explanation: "Not every merchant needs all three. You select the relevant one(s) based on how they operate."
      },
      {
        question: "SCENARIO: A merchant says 'I'm convinced, let's do this' after Stage 2 (Story Proof). What do you do?",
        type: "multiple_choice",
        options: [
          "Close immediately—don't talk them out of it",
          "Briefly cover Process and Trust to ensure a solid foundation, then close",
          "Start over from the beginning",
          "Skip straight to paperwork"
        ],
        correctAnswer: 1,
        explanation: "Enthusiasm is great, but shortcuts create problems. A 2-minute Trust overview prevents buyer's remorse and creates a confident customer."
      }
    ]
  },

  // ============================================================================
  // MODULE 2: OPENING & PROBLEM AWARENESS
  // ============================================================================
  {
    moduleNumber: 2,
    lesson: {
      lessonNumber: 21,
      title: "The Visceral Opening",
      scriptText: `Ever close the month—staring at the deposit screen, adding it up twice—and still feel that quiet knot in your stomach, like you worked another month for almost nothing?

You're not imagining it. And it's not because you're doing something wrong. It's not your fault.

Every card you accept—dip, tap, swipe—three to four percent quietly comes off the top. On a forty-dollar ticket, that's a dollar twenty. A dollar sixty. Gone. Every single time.

Do that a few hundred times a month? A few thousand? That can turn into ten, fifteen, even twenty-five thousand a year that never hits your account.`,
      practicePrompt: "Master the emotional opening that makes the merchant feel the problem viscerally. Create identification before any solution discussion.",
      keyQuestions: [
        "Does that feeling sound familiar?",
        "When you look at your monthly deposit, do you ever wonder where the rest went?",
        "What's your average ticket size?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They're running a business and feeling the squeeze. They know something is wrong but may not have quantified it.",
        commonMistake: "Rushing through the opening or delivering it in a flat, informational tone.",
        howPhrasingPreventsResistance: "'It's not your fault' removes shame and creates alliance. You're on their side against the real problem.",
        skipConsequence: "Without emotional activation, the rest of the presentation is just information. Information doesn't motivate action."
      },
      practiceDrill: {
        title: "Visceral Opening Delivery",
        duration: "3 minutes",
        steps: [
          "Record yourself delivering the opening",
          "Focus on pace—slower than conversational",
          "Pause after 'almost nothing' for 2 full seconds",
          "Deliver 'It's not your fault' with warmth, not pity"
        ],
        roleplayPrompt: "You are a tired business owner at the end of a long day. If the opening resonates, show quiet recognition. If it feels like a pitch, check your phone.",
        badExample: "Processing fees are 3-4% and that adds up over time.",
        goodExample: "Ever close the month—staring at the deposit screen, adding it up twice—and still feel that quiet knot in your stomach?",
        aiCoachingPrompt: "I will deliver the visceral opening. As a business owner, tell me if it makes you feel something or if it sounds like a sales script. Score me 1-10 on emotional impact."
      },
      psychologyTag: "Loss Aversion Activation",
      whenToUse: "First 25 seconds of any presentation or conversation.",
      commonMistakes: "Rushing through it. Adding qualifiers like 'some owners feel...' Jumping to solution before they sit in the problem. Flat delivery.",
      mechanism: "Amygdala Activation",
    },
    quizzes: [
      {
        question: "What phrase removes shame and creates alliance with the merchant?",
        type: "multiple_choice",
        options: [
          "'You're losing money'",
          "'It's not your fault'",
          "'Other businesses have this problem'",
          "'Let me help you'"
        ],
        correctAnswer: 1,
        explanation: "'It's not your fault' positions you as an ally against the real problem—the system, not them."
      },
      {
        question: "How should you deliver the visceral opening?",
        type: "multiple_choice",
        options: [
          "Quickly and efficiently",
          "Slower than conversational, with strategic pauses",
          "With high energy and enthusiasm",
          "Reading from notes"
        ],
        correctAnswer: 1,
        explanation: "Slow, deliberate delivery with pauses lets the emotion land. Rushing kills the impact."
      },
      {
        question: "What should happen after you say 'almost nothing'?",
        type: "multiple_choice",
        options: [
          "Immediately continue with the next sentence",
          "Pause for 2 full seconds",
          "Ask a question",
          "Show a graph"
        ],
        correctAnswer: 1,
        explanation: "The pause lets the weight of the words settle. Rushing past it wastes the moment."
      }
    ]
  },
  {
    moduleNumber: 2,
    lesson: {
      lessonNumber: 22,
      title: "Fee Quantification (Anchoring)",
      scriptText: `Marcus runs a tire shop outside Houston. When we showed him his number, he stopped mid-sentence. Rubbed the back of his neck, eyes on the floor.

His voice got quiet—the way it does when you're doing math you don't want to believe.

Seventeen thousand four hundred twelve dollars a year.

He leaned back and whispered, 'That's my truck payment. Every year. Just... gone.'

When you know your number—when you see it written down—it changes how you think about every transaction.`,
      practicePrompt: "Learn to use specific numbers and tangible asset conversion to make abstract fees concrete and memorable.",
      keyQuestions: [
        "What's your average monthly processing volume?",
        "Do you know what you're paying in total fees each month?",
        "What could you do with an extra thousand dollars a month?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They've never seen their actual number. When they do, it becomes real and undeniable.",
        commonMistake: "Using round numbers like 'about $17,000' instead of precise figures.",
        howPhrasingPreventsResistance: "'That's my truck payment' converts abstract money into a physical asset they can visualize losing.",
        skipConsequence: "Without quantification, the problem stays theoretical. Numbers make it real."
      },
      practiceDrill: {
        title: "Precise Number Delivery",
        duration: "2 minutes",
        steps: [
          "Practice saying '$17,412' with the same weight as 'That's my truck payment'",
          "Never round—use the exact figure",
          "Pause after stating the number",
          "Practice the tangible asset conversion"
        ],
        roleplayPrompt: "You've never calculated your annual processing fees. When you hear the exact number, react with surprise. If it's a round number, be less impressed.",
        badExample: "You're probably losing around $17,000 a year.",
        goodExample: "Seventeen thousand four hundred twelve dollars a year. He whispered, 'That's my truck payment. Every year. Just... gone.'",
        aiCoachingPrompt: "I will deliver Marcus's story with the fee quantification. Does the number feel precise and real, or vague and salesy? Score me 1-10."
      },
      psychologyTag: "Anchoring + Tangible Conversion",
      whenToUse: "Right after the emotional opening. Make the problem concrete.",
      commonMistakes: "Using round numbers. Not converting to tangible assets. Letting the number sit without emotional punch.",
      mechanism: "Dollar Anchoring",
    },
    quizzes: [
      {
        question: "Why use '$17,412' instead of 'about $17,000'?",
        type: "multiple_choice",
        options: [
          "It's technically more accurate",
          "Precision signals you actually ran the math and is more memorable",
          "It's a bigger number",
          "Compliance requires exact figures"
        ],
        correctAnswer: 1,
        explanation: "Precise numbers are remembered and believed. Round numbers sound like estimates."
      },
      {
        question: "What is 'tangible asset conversion'?",
        type: "multiple_choice",
        options: [
          "Converting fees to cash",
          "Transforming abstract fees into a physical asset they can visualize",
          "Showing equipment options",
          "Calculating ROI"
        ],
        correctAnswer: 1,
        explanation: "'That's my truck payment' makes abstract fees feel like losing something real."
      }
    ]
  },
  {
    moduleNumber: 2,
    lesson: {
      lessonNumber: 23,
      title: "Identity Activation (6 AM Scene)",
      scriptText: `Now picture your actual day. It's 6 AM. Parking lot's still dark. You're already running through the list before your coffee's even warm.

You're not here because you're excited. You're here because nothing happens unless you make it happen.

By tonight, you'll have put out a dozen fires, solved problems your customers never see—and carried a few home you didn't talk about.

You've earned every dollar ten times over. And right now, three to four cents of every one of them is being taken before you even touch it.`,
      practicePrompt: "Master identity activation that makes the merchant feel seen and validated. Create deep recognition before positioning any solution.",
      keyQuestions: [
        "What time does your day actually start?",
        "What's the thing you deal with that customers never see?",
        "When's the last time you took a real day off?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They're exhausted and often feel unseen. When someone describes their reality accurately, trust is built instantly.",
        commonMistake: "Being too general ('business owners work hard'). The power is in specific, visceral details.",
        howPhrasingPreventsResistance: "The specific time (6 AM), physical details (dark parking lot, coffee), and emotional truth (carried problems home) create powerful recognition.",
        skipConsequence: "Without identity activation, you're just another salesperson. With it, you're someone who understands."
      },
      practiceDrill: {
        title: "Identity Scene Delivery",
        duration: "3 minutes",
        steps: [
          "Describe the 6 AM moment for three different business types",
          "Add one specific physical detail for each",
          "Practice 'carried a few home you didn't talk about' with weight",
          "Transition smoothly to the fee reframe"
        ],
        roleplayPrompt: "You are a business owner who started at 5:30 AM today. If the 6 AM scene feels accurate to your life, show quiet recognition. If it feels generic, remain neutral.",
        badExample: "I know business owners work really hard.",
        goodExample: "It's 6 AM. Parking lot's still dark. You're already running through the list before your coffee's even warm.",
        aiCoachingPrompt: "I will deliver the 6 AM identity scene. As a business owner, tell me if it sounds like my life or like a script. Score me 1-10 on recognition."
      },
      psychologyTag: "Identity Reinforcement",
      whenToUse: "After quantifying fees. Expand from one merchant's experience to universal business owner identity.",
      commonMistakes: "Being too general or generic. Missing the emotional truth. Rushing through without letting recognition land.",
      mechanism: "Identity Activation",
    },
    quizzes: [
      {
        question: "Why use '6 AM' and 'dark parking lot' instead of 'early mornings'?",
        type: "multiple_choice",
        options: [
          "It's more dramatic",
          "Specific details create recognition—they've lived this exact moment",
          "It's chronologically accurate",
          "It sets up the next section"
        ],
        correctAnswer: 1,
        explanation: "Specific, visceral details bypass skepticism because they match lived experience."
      },
      {
        question: "What does 'carried a few home you didn't talk about' accomplish?",
        type: "multiple_choice",
        options: [
          "Creates guilt",
          "Validates the emotional weight they carry and creates deep recognition",
          "Sets up a question",
          "Transitions to the close"
        ],
        correctAnswer: 1,
        explanation: "This acknowledges the unseen burden of ownership. It says 'I see you.'"
      }
    ]
  },

  // ============================================================================
  // MODULE 3: SOLUTION POSITIONING
  // ============================================================================
  {
    moduleNumber: 3,
    lesson: {
      lessonNumber: 31,
      title: "The Three Options Framework",
      scriptText: `Three ways to stop this. The first is obvious. The second seems like it solves the problem—but doesn't. The third is the one most processors won't show you.

Option one: Make sure you're paying what you're supposed to—nothing more. It's called interchange-plus. You pay the true cost the card networks charge, plus a small fixed fee. When their rates drop, your costs drop. That's how it should work. For white-glove brands where the experience depends on one clean price all the way through checkout, this is usually the right fit.

Option two: Add a fee to credit card transactions to cover your cost. It's called surcharging. And for some businesses, it works fine. But here's what most reps won't tell you: you can't surcharge debit cards. Federal law prohibits it. And for most businesses, debit is 30 to 40 percent of transactions. Surcharging plugs part of the leak. Not all of it. The rest? You still pay it.

Option three: Stop paying the processing fee out of your margin entirely—on credit AND debit. With Dual Pricing, you offer two prices: one for cash, one for cards. It's fully automated. The system does the math. Customers see both options and decide how they want to pay. You're not hoping your processor passes savings along. You're keeping what you earned—every transaction. Credit or debit—doesn't matter. When set up right, the leak is closed.`,
      practicePrompt: "Present three solutions in a way that makes Dual Pricing feel like the complete answer. Position options without bias while guiding toward the best fit.",
      keyQuestions: [
        "Which of these sounds closest to what you'd be comfortable with?",
        "Have you heard of surcharging before? Did anyone explain the debit card issue?",
        "What percentage of your customers pay with debit versus credit?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They want options, not pressure. The three-option framework respects their intelligence while guiding them toward the most complete solution.",
        commonMistake: "Only presenting Dual Pricing and ignoring alternatives. This feels pushy and makes them wonder what you're hiding.",
        howPhrasingPreventsResistance: "Presenting all options—including interchange-plus for premium businesses—shows honesty. You're not just selling one thing.",
        skipConsequence: "Without alternatives, they wonder if there's a better option you're not telling them about. The framework closes that loop."
      },
      practiceDrill: {
        title: "Three Options Delivery",
        duration: "4 minutes",
        steps: [
          "Practice presenting all three options neutrally",
          "Time yourself—aim for 90 seconds total",
          "Make sure the surcharging limitation lands clearly",
          "End with Dual Pricing feeling like the complete solution, not the 'best' option"
        ],
        roleplayPrompt: "You've heard about surcharging from another rep. When I explain the debit limitation, show surprise if I explain it clearly. Show skepticism if I gloss over it.",
        badExample: "Interchange-plus is a ripoff, surcharging doesn't work, you need Dual Pricing.",
        goodExample: "Surcharging works—but here's what most reps don't tell you: you can't surcharge debit cards. Federal law. For most businesses, that's 30-40% of transactions still leaking.",
        aiCoachingPrompt: "I will present the three options. Interrupt me with questions like 'Why wouldn't I just do surcharging?' and 'What about interchange-plus?' Make me defend each position without bashing alternatives. Score me 1-10 on balance and clarity."
      },
      psychologyTag: "Choice Architecture",
      whenToUse: "After establishing the problem, before diving into solution details.",
      commonMistakes: "Bashing Option 1 (interchange-plus) instead of positioning it appropriately. Not explaining the surcharging/debit limitation clearly. Making Dual Pricing sound too good to be true.",
      mechanism: "Choice Architecture Setup",
    },
    quizzes: [
      {
        question: "Why do we present all three options instead of just Dual Pricing?",
        type: "multiple_choice",
        options: [
          "Compliance requires it",
          "It shows honesty and prevents them from wondering what we're hiding",
          "It takes more time and builds rapport",
          "Some merchants really want surcharging"
        ],
        correctAnswer: 1,
        explanation: "Presenting alternatives shows you're a consultant, not just a salesperson."
      },
      {
        question: "What is the key limitation of surcharging?",
        type: "multiple_choice",
        options: [
          "It's illegal in all states",
          "You can't surcharge debit cards—federal law prohibits it",
          "Customers hate it",
          "It requires special equipment"
        ],
        correctAnswer: 1,
        explanation: "The debit limitation is the key differentiator. Make sure it lands."
      },
      {
        question: "For what type of business is interchange-plus 'usually the right fit'?",
        type: "multiple_choice",
        options: [
          "High-volume restaurants",
          "White-glove/premium brands where the experience depends on one clean price",
          "Mobile service businesses",
          "E-commerce only"
        ],
        correctAnswer: 1,
        explanation: "Premium/luxury businesses where price transparency at checkout could diminish the experience."
      },
      {
        question: "SCENARIO: A merchant says 'My friend uses surcharging and loves it.' How do you respond?",
        type: "multiple_choice",
        options: [
          "'Surcharging doesn't really work.'",
          "'That's great—what type of business? Do they know about the debit card issue?'",
          "'Dual Pricing is better.'",
          "'They're probably losing money on debit transactions.'"
        ],
        correctAnswer: 1,
        explanation: "Don't attack surcharging—explore their understanding and gently surface the limitation."
      }
    ]
  },
  {
    moduleNumber: 3,
    lesson: {
      lessonNumber: 32,
      title: "Competitor Disqualification (Without Attacking)",
      scriptText: `So why don't more processors offer this? We invest capital upfront—up to a thousand dollars before you process your first transaction. That means we're selective. We're looking for businesses with consistent volume, owners who take their numbers seriously. Not everyone qualifies.

We make our margin when you process—so we only succeed when you do. That's why we invest upfront and stay invested in your growth.

Here's a quick way to know if Dual Pricing fits: your customers pay by card or debit, they compare prices before they buy, and they wouldn't blink at gas stations showing cash and card. Dual Pricing feels normal to them. They see two totals, they choose, they move on.`,
      practicePrompt: "Differentiate from competitors by explaining limitations, not by attacking them. Let the facts do the work.",
      keyQuestions: [
        "What's your experience been with processors making promises about rates?",
        "Do your customers typically compare prices before buying?",
        "Have you seen the cash/card pricing at gas stations? Do your customers shop there?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They're wondering 'what's the catch?' This section answers that directly by explaining the business model transparently.",
        commonMistake: "Bashing competitors by name or making them sound stupid. This backfires—if the merchant chose them, you're calling them stupid.",
        howPhrasingPreventsResistance: "'Not everyone qualifies' creates selectivity—they want to be one of the ones who does. 'We only succeed when you do' removes hidden-fee suspicion.",
        skipConsequence: "Without addressing 'why don't others offer this,' the deal seems too good to be true. Suspicion kills conversions."
      },
      practiceDrill: {
        title: "Business Model Explanation",
        duration: "2 minutes",
        steps: [
          "Practice explaining why you invest upfront",
          "Practice the 'we only succeed when you do' line with sincerity",
          "Time yourself—aim for 45 seconds on this section"
        ],
        roleplayPrompt: "You're a skeptical merchant. When I explain our business model, probe for the catch. If my explanation sounds transparent and aligned, nod. If it sounds too good, challenge me.",
        badExample: "Other processors are just trying to rip you off. We're the good guys.",
        goodExample: "We make our margin when you process—so we only succeed when you do. That's why we invest upfront and stay invested in your growth.",
        aiCoachingPrompt: "You are a skeptical merchant. I will explain our business model. Ask me directly: 'So what's the catch?' and 'How do you make money?' If my answers sound evasive, push harder. If they sound transparent, show acceptance. Score me 1-10."
      },
      psychologyTag: "Trust Through Transparency",
      whenToUse: "After presenting the three options, to address the 'what's the catch' concern.",
      commonMistakes: "Naming specific competitors to bash. Making claims you can't back up. Not explaining your own business model transparently.",
      mechanism: "Competitor Disqualification",
    },
    quizzes: [
      {
        question: "Why do we explain 'why other processors don't offer this'?",
        type: "multiple_choice",
        options: [
          "To bash competitors",
          "To address the 'what's the catch' concern before they ask",
          "It's a compliance requirement",
          "To fill time"
        ],
        correctAnswer: 1,
        explanation: "The deal sounds good—which creates suspicion. Answer it proactively."
      },
      {
        question: "What does 'Not everyone qualifies' accomplish?",
        type: "multiple_choice",
        options: [
          "Discourages unqualified leads",
          "Creates selectivity—they want to be one of the ones who qualifies",
          "Sets up the qualification process",
          "It's technically true"
        ],
        correctAnswer: 1,
        explanation: "Selectivity creates desire. If not everyone can have it, they want it more."
      },
      {
        question: "What's wrong with saying 'Other processors are ripoffs'?",
        type: "multiple_choice",
        options: [
          "It's legally risky",
          "If the merchant chose them, you're calling the merchant stupid",
          "It takes too much time",
          "Nothing—honesty is good"
        ],
        correctAnswer: 1,
        explanation: "Never attack past choices. It makes them defensive."
      }
    ]
  },
  {
    moduleNumber: 3,
    lesson: {
      lessonNumber: 33,
      title: "Dual Pricing as the Complete Solution",
      scriptText: `With Dual Pricing, you offer two prices: one for cash, one for cards. It's fully automated. The system does the math. Customers see both options and decide how they want to pay.

You're not hoping your processor passes savings along. You're not waiting on the market. You're keeping what you earned—transaction after transaction.

This isn't a surprise fee. It's two posted prices, shown clearly—like you see at gas stations. We set it up with the right disclosures for your business type and state, so you stay compliant without babysitting it.

Setup is fast—most businesses are live within a day or two. And the savings? Measurable from day one.`,
      practicePrompt: "Position Dual Pricing as the only option that closes the entire leak—credit AND debit. Make the choice obvious without being pushy.",
      keyQuestions: [
        "Does that make sense? Cash price and card price, customer chooses?",
        "Have you seen that setup at gas stations or restaurants?",
        "What questions do you have about how it works day-to-day?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They need to understand exactly what happens. 'Customer sees two prices and picks' is simple. Complexity kills sales.",
        commonMistake: "Over-explaining the technical details. The merchant doesn't care how the system calculates—they care what the customer experiences.",
        howPhrasingPreventsResistance: "'Like you see at gas stations' normalizes the experience. It's not weird or new—they've seen it. 'Setup is fast' removes time friction.",
        skipConsequence: "Without clear explanation, they can't visualize it working in their business. Confusion creates delay."
      },
      practiceDrill: {
        title: "Dual Pricing Explanation",
        duration: "2 minutes",
        steps: [
          "Explain Dual Pricing in exactly 30 seconds",
          "Hit these points: two prices, automated, customer chooses, credit AND debit",
          "Include the gas station normalization",
          "End with 'measurable from day one'"
        ],
        roleplayPrompt: "You've never heard of dual pricing. If the explanation is clear and simple, say 'Okay, that makes sense.' If it's confusing, ask 'Wait, so what exactly does the customer see?'",
        badExample: "So basically what happens is the interchange rate gets calculated at the point of sale and then the system applies a cash discount adjustment to the base price...",
        goodExample: "Customer sees two prices: cash price and card price. They pick. It's like gas stations. That simple.",
        aiCoachingPrompt: "You have never heard of dual pricing. I will explain it. If my explanation would confuse a normal person, interrupt with 'I don't get it.' If it's clear, say 'Oh, like at gas stations?' Score me 1-10 on clarity and simplicity."
      },
      psychologyTag: "Solution Completeness",
      whenToUse: "After presenting all three options, when focusing on Dual Pricing as the fit.",
      commonMistakes: "Getting too technical about interchange calculations. Forgetting to mention 'credit AND debit' which is the key differentiator. Not normalizing it with gas station comparison.",
      mechanism: "Solution Positioning",
    },
    quizzes: [
      {
        question: "What is the standard Dual Pricing definition?",
        type: "multiple_choice",
        options: [
          "Charging extra for credit cards",
          "Two prices: one for cash, one for cards. Customer sees both and chooses.",
          "A surcharge on all transactions",
          "Tiered pricing based on volume"
        ],
        correctAnswer: 1,
        explanation: "Keep it simple. Two prices, customer chooses."
      },
      {
        question: "Why do we compare Dual Pricing to gas stations?",
        type: "multiple_choice",
        options: [
          "Gas stations use our system",
          "It normalizes the experience—they've seen this before",
          "Gas stations have the best savings",
          "It's a compliance requirement"
        ],
        correctAnswer: 1,
        explanation: "Normalization reduces fear. If they've seen it, it's not scary."
      },
      {
        question: "SCENARIO: A merchant asks 'So you're saying my customers pay more?' How do you reframe?",
        type: "multiple_choice",
        options: [
          "'Yes, but only if they use a card.'",
          "'Your prices don't change—the card price is what you've always charged. Cash customers just get a discount.'",
          "'It's only 3-4%.'",
          "'Most customers won't notice.'"
        ],
        correctAnswer: 1,
        explanation: "The reframe: your prices stay the same. Cash gets a discount. This is psychologically different from 'card pays more.'"
      }
    ]
  },

  // ============================================================================
  // MODULE 4: OBJECTION PREVENTION
  // ============================================================================
  {
    moduleNumber: 4,
    lesson: {
      lessonNumber: 41,
      title: "The Customer Reaction Fear",
      scriptText: `Right about now, you're probably thinking: This sounds great on paper—but what happens when Mrs. Johnson sees two prices and gives me that look?

If your first thought is, "What will my customers think?"—good. That's the question every smart owner asks.

Marcus asked it too, before he switched. First week, he braced for complaints. By week three, he stopped thinking about it.

Here's what to say if a customer asks: 'It's posted upfront, and it keeps our prices fair.' That's it. Short, confident, non-defensive. Most won't ask.`,
      practicePrompt: "Name the fear before the merchant voices it. Demonstrate deep understanding while normalizing the concern.",
      keyQuestions: [
        "Is the customer reaction your main concern right now?",
        "What's the worst thing you imagine a customer saying?",
        "Have you seen other businesses handle this successfully?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "The #1 fear is customer backlash. They're imagining Mrs. Johnson—their loyal regular—giving them 'that look.'",
        commonMistake: "Waiting for them to voice the objection. By then, they've already started building resistance.",
        howPhrasingPreventsResistance: "Naming the fear first shows you understand. 'Every smart owner asks' normalizes AND compliments them for thinking of it.",
        skipConsequence: "They'll think of it anyway. Better to address it head-on than let it fester unspoken."
      },
      practiceDrill: {
        title: "Fear Naming Drill",
        duration: "2 minutes",
        steps: [
          "Practice saying 'Mrs. Johnson' with a knowing smile",
          "Deliver 'every smart owner asks' with genuine warmth",
          "Practice the customer response: 'It's posted upfront, and it keeps our prices fair.'",
          "Say it 5 times until it feels natural"
        ],
        roleplayPrompt: "You are worried about customer reaction but haven't said it yet. If I name your fear accurately, show relief. If I miss it, stay guarded.",
        badExample: "Don't worry, customers won't care.",
        goodExample: "Right about now, you're probably thinking: what happens when Mrs. Johnson sees two prices and gives me that look?",
        aiCoachingPrompt: "I will attempt to name the customer reaction fear. As a merchant, tell me if I named it accurately or if I missed what you were actually worried about. Score me 1-10."
      },
      psychologyTag: "Social Friction Neutralization",
      whenToUse: "Immediately after presenting Dual Pricing. Anticipate the objection before it forms.",
      commonMistakes: "Waiting for the merchant to voice the objection. Being defensive about the concern. Not normalizing it ('every smart owner asks').",
      mechanism: "Objection Prevention",
    },
    quizzes: [
      {
        question: "Why do we name the customer reaction fear before the merchant voices it?",
        type: "multiple_choice",
        options: [
          "To save time",
          "To demonstrate deep understanding and prevent defensiveness",
          "Because it's always their #1 concern",
          "To control the conversation"
        ],
        correctAnswer: 1,
        explanation: "Naming their fear shows you understand them. It transforms an objection into a shared concern."
      },
      {
        question: "What does 'That's the question every smart owner asks' accomplish?",
        type: "multiple_choice",
        options: [
          "Flattery",
          "Normalizes the concern AND compliments them for having it",
          "Buys time",
          "Deflects the objection"
        ],
        correctAnswer: 1,
        explanation: "They're not wrong to worry—they're smart. Now you can address it together."
      },
      {
        question: "Why use 'Mrs. Johnson' instead of 'your customers'?",
        type: "multiple_choice",
        options: [
          "Mrs. Johnson is a real customer reference",
          "Specific names make fears concrete and addressable; 'customers' is vague",
          "It's a legal requirement",
          "It sounds more professional"
        ],
        correctAnswer: 1,
        explanation: "Vague fears feel overwhelming. Specific fears feel solvable."
      }
    ]
  },
  {
    moduleNumber: 4,
    lesson: {
      lessonNumber: 42,
      title: "Social Proof and Time Decay",
      scriptText: `Marcus asked it too, before he switched. First week, he braced for complaints. By week three, he stopped thinking about it.

One of his regulars—a woman named Sarah—paused at the counter, looked at the screen, then smiled. "Finally," she said. "A shop that's honest about what cards cost." She's sent three new customers his way since. When he asked her why, she just said, "It feels like they care."

Another regular—a contractor named Tom—told Marcus: "I run the same program at my shop. Wish more people were honest about it."

The money Marcus used to lose—over thirteen thousand a year—didn't vanish anymore. It stayed in his business. Thousands of service businesses, restaurants, and retail shops have already made this switch—and the ones we talk to say the same thing: they wish they'd done it sooner.`,
      practicePrompt: "Use Marcus's experience to show how the fear dissolves over time. Introduce social proof through customer testimonials within the story.",
      keyQuestions: [
        "Can you imagine a customer like Sarah in your business?",
        "Do you have regulars who would appreciate that kind of transparency?",
        "Have any of your customers mentioned they use cash/card pricing at their own businesses?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They're imagining worst-case scenarios. Sarah and Tom are best-case scenarios that feel realistic. The time decay ('by week three, he stopped thinking about it') shows the fear is temporary.",
        commonMistake: "Only showing the positive without acknowledging the initial fear. 'First week, he braced for complaints' validates their concern before resolving it.",
        howPhrasingPreventsResistance: "Sarah's quote—'A shop that's honest about what cards cost'—reframes dual pricing from 'charging more' to 'being honest.' Tom's quote normalizes it among business owners.",
        skipConsequence: "Without social proof, they rely only on your word. Sarah and Tom are third-party validation."
      },
      practiceDrill: {
        title: "Social Proof Delivery",
        duration: "3 minutes",
        steps: [
          "Practice the full Sarah/Tom sequence",
          "Sarah's line should sound like you're quoting her exactly",
          "Tom's line should sound casual and authentic",
          "End with 'they wish they'd done it sooner'—this creates FOMO"
        ],
        roleplayPrompt: "You're skeptical of testimonials—you've heard sales reps make things up. If Sarah and Tom sound like real people, show interest. If they sound like marketing copy, tune out.",
        badExample: "Our customers love it! Everyone says it's great!",
        goodExample: "Sarah paused at the counter, looked at the screen, then smiled. 'Finally,' she said. 'A shop that's honest about what cards cost.'",
        aiCoachingPrompt: "I will deliver the Sarah and Tom testimonials. Rate their authenticity. Do they sound like real people or marketing material? Score me 1-10 on believability."
      },
      psychologyTag: "Third-Party Validation",
      whenToUse: "Immediately after naming the customer reaction fear.",
      commonMistakes: "Skipping the 'first week, braced for complaints' part. Making testimonials sound too perfect or rehearsed. Not including the time decay element.",
      mechanism: "Social Proof + Time Decay",
    },
    quizzes: [
      {
        question: "Why include 'First week, he braced for complaints'?",
        type: "multiple_choice",
        options: [
          "To be honest about challenges",
          "It validates their fear before showing how it resolves",
          "It's part of the required script",
          "Marcus really did struggle"
        ],
        correctAnswer: 1,
        explanation: "Acknowledging the fear makes the resolution more credible."
      },
      {
        question: "What does Sarah's quote accomplish?",
        type: "multiple_choice",
        options: [
          "Shows customers save money",
          "Reframes dual pricing from 'charging more' to 'being honest'",
          "Proves PCBancard has satisfied customers",
          "Creates urgency"
        ],
        correctAnswer: 1,
        explanation: "'Honest about what cards cost' is a powerful reframe."
      },
      {
        question: "'They wish they'd done it sooner' creates:",
        type: "multiple_choice",
        options: [
          "Urgency",
          "FOMO—fear of missing out on savings they could have had",
          "Trust",
          "Rapport"
        ],
        correctAnswer: 1,
        explanation: "The regret of waiting is a powerful motivator."
      }
    ]
  },
  {
    moduleNumber: 4,
    lesson: {
      lessonNumber: 43,
      title: "The Math Reframe (1 in 100)",
      scriptText: `Here's the math most owners run in their head: if I lose one customer out of twenty because of the price difference—does that wipe out my savings?

For most businesses, the answer is no. You'd have to lose closer to one in four just to break even.

In the real world, it's closer to one in a hundred. And that customer probably wasn't profitable for you to begin with.`,
      practicePrompt: "Use simple math to show that the fear of losing customers is statistically unfounded. Make the risk feel small and the reward feel large.",
      keyQuestions: [
        "Have you run that math in your head?",
        "What percentage of customers do you think would actually leave over the card price?",
        "Is there a customer you've kept that honestly costs you more than they're worth?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They're imagining 20-30% of customers leaving. The math shows they'd need to lose 25% just to break even, and reality is 1%. This reframes the risk dramatically.",
        commonMistake: "Not doing the math explicitly. Merchants need to see the calculation to believe it.",
        howPhrasingPreventsResistance: "'That customer probably wasn't profitable for you to begin with' gives them permission to not worry about price-sensitive customers who were never good for business.",
        skipConsequence: "Without the math, their imagined risk remains. Numbers cut through fear."
      },
      practiceDrill: {
        title: "Math Reframe Delivery",
        duration: "2 minutes",
        steps: [
          "Practice the 1 in 20 → 1 in 4 → 1 in 100 sequence",
          "Use your hands to illustrate (hold up fingers for numbers)",
          "Land hard on 'one in a hundred'",
          "The final line about unprofitable customers should feel like relief, not dismissal"
        ],
        roleplayPrompt: "You've been imagining losing 20% of customers. If the math makes sense and reframes your fear, show relief. If it feels like hand-waving, express skepticism.",
        badExample: "Don't worry, you won't lose customers.",
        goodExample: "You'd have to lose 1 in 4 just to break even. In reality? It's 1 in 100. And that customer probably wasn't profitable anyway.",
        aiCoachingPrompt: "I will deliver the math reframe. As a merchant who fears losing customers, evaluate whether the math changes your perception of risk. Score me 1-10 on how well I shifted your fear with logic."
      },
      psychologyTag: "Risk Reframe",
      whenToUse: "After social proof. This provides the logical backup for the emotional reassurance.",
      commonMistakes: "Skipping the math entirely. Not walking through the progression. Forgetting the 'wasn't profitable' reframe.",
      mechanism: "Risk Reframe",
    },
    quizzes: [
      {
        question: "What ratio would need to leave for the merchant to 'break even' on savings?",
        type: "multiple_choice",
        options: [
          "1 in 10",
          "1 in 20",
          "1 in 4 (approximately 25%)",
          "1 in 50"
        ],
        correctAnswer: 2,
        explanation: "They'd need to lose ~25% of customers just to break even. Real-world attrition is far lower."
      },
      {
        question: "What is the 'real world' customer attrition rate mentioned?",
        type: "multiple_choice",
        options: [
          "1 in 10",
          "1 in 20",
          "1 in 100",
          "1 in 1000"
        ],
        correctAnswer: 2,
        explanation: "1 in 100—far lower than they're imagining."
      },
      {
        question: "'That customer probably wasn't profitable for you to begin with' accomplishes:",
        type: "multiple_choice",
        options: [
          "Dismisses their concern",
          "Gives permission to not worry about ultra-price-sensitive customers",
          "Insults their customers",
          "Creates urgency"
        ],
        correctAnswer: 1,
        explanation: "It's okay to lose a customer who was never profitable."
      }
    ]
  },

  // ============================================================================
  // MODULE 5: STORY, PROOF, AND TRANSFORMATION
  // ============================================================================
  {
    moduleNumber: 5,
    lesson: {
      lessonNumber: 51,
      title: "Mike's Hero Journey",
      scriptText: `Mike owns a repair shop outside Austin. The kind where the guy answering the phone is the same guy under the hood. He poured everything into that place—sixteen-hour days, missed weekends, a truck that doubled as his office.

Like most service businesses, most of his revenue came in on cards. About thirty-five thousand a month. And he was losing over thirteen thousand a year to processing fees.

He did what most owners do when things get tight. He cut hours. He delayed hiring. He put off new equipment. He told his wife things were fine. She stopped asking. Started putting the mail on his desk without opening it. They both knew.

In his worst months, he sat in his truck before opening—engine off, coffee going cold on the dash—running payroll numbers in his head, wondering which tech to let go. Not because he wanted to. Because the math told him to.

He was working harder than ever. And watching other people take the first slice of every dollar he earned.`,
      practicePrompt: "Tell Mike's story in a way that creates identification and hope. Show the transformation from struggling owner to confident builder.",
      keyQuestions: [
        "Does any of that sound familiar?",
        "Have you ever had a moment like the truck scene—running numbers you didn't want to run?",
        "What do you put off when things get tight?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They need to see someone like them who felt the same struggles. Mike isn't introduced as a success—he's introduced at his lowest point. That's relatable.",
        commonMistake: "Rushing through the struggle to get to the victory. The power is in the pain. Let them feel it.",
        howPhrasingPreventsResistance: "Sensory details (cold coffee, engine off, mail on desk) make it real. 'They both knew' about the wife creates emotional weight.",
        skipConsequence: "Without the struggle, the transformation feels unearned and unbelievable."
      },
      practiceDrill: {
        title: "Mike's Struggle Delivery",
        duration: "4 minutes",
        steps: [
          "Practice the full struggle section until you can deliver it without reading",
          "Focus on the truck scene—slow down, lower your voice",
          "The wife detail should land with weight, not be rushed through",
          "Time yourself: the struggle section should take 90 seconds minimum"
        ],
        roleplayPrompt: "You're a business owner who has had dark moments. If Mike's story resonates with something you've felt, show quiet recognition. If it feels performative, show discomfort.",
        badExample: "Mike was having a hard time with his business and losing money on fees.",
        goodExample: "In his worst months, he sat in his truck before opening—engine off, coffee going cold on the dash—wondering which tech to let go.",
        aiCoachingPrompt: "I will deliver Mike's struggle story. As a merchant, tell me if it resonates with any experience you've had. Score me 1-10 on emotional authenticity."
      },
      psychologyTag: "Narrative Transport",
      whenToUse: "After positioning Dual Pricing, to show proof of transformation.",
      commonMistakes: "Starting with Mike's success instead of his struggle. Summarizing instead of showing ('He was struggling financially'). Skipping emotional details like the wife and the truck.",
      mechanism: "Hero's Journey Structure",
    },
    quizzes: [
      {
        question: "Why is Mike introduced at his lowest point instead of his success?",
        type: "multiple_choice",
        options: [
          "It's chronologically accurate",
          "Struggle is relatable—they're not at success yet either",
          "It creates drama",
          "It's shorter"
        ],
        correctAnswer: 1,
        explanation: "They identify with the problem, not the solution."
      },
      {
        question: "Why is the truck scene important?",
        type: "multiple_choice",
        options: [
          "It shows Mike has a truck",
          "It's a specific, visceral moment of despair that business owners recognize",
          "It explains his commute",
          "It builds credibility"
        ],
        correctAnswer: 1,
        explanation: "The alone-in-the-truck moment is universal among struggling owners."
      },
      {
        question: "How long should the struggle section take to deliver?",
        type: "multiple_choice",
        options: [
          "30 seconds",
          "60 seconds",
          "90 seconds minimum",
          "As fast as possible"
        ],
        correctAnswer: 2,
        explanation: "The struggle needs time to land. Rushing undermines the emotional impact."
      }
    ]
  },
  {
    moduleNumber: 5,
    lesson: {
      lessonNumber: 52,
      title: "The Profit Flywheel Concept",
      scriptText: `Eliminating a fee is nice. Reinvesting it is powerful.

We call it the Profit Flywheel—because once it starts spinning, it doesn't stop. The margin that used to disappear becomes the fuel that powers your growth.

Mike didn't treat those savings like a discount. He treated them like an investment budget.

Marketing: He took three thousand dollars and ran basic Facebook and Google ads. For every dollar he spent, he averaged about two-fifty back. Five brand-new customers. Seventy-five hundred in new revenue.

Loyalty: He put twenty-five hundred into a simple points program. Repeat visits jumped by nearly a third.

Training: He invested two thousand in a certification for Lisa, his lead tech. She doubled her output. The day her cert came in the mail, she stayed an hour late just to hang it.

Between those reinvestments and the fees he stopped paying, his thirteen thousand in savings turned into over twenty-eight thousand in new revenue—and about four thousand in net profit. In year one.`,
      practicePrompt: "Show how retained fees become fuel for growth. Paint a picture of compound returns that makes savings feel like an investment strategy.",
      keyQuestions: [
        "If you kept that money, what would you invest it in first?",
        "Is there training your team has been asking for?",
        "What marketing have you wanted to try but couldn't afford?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "Savings sounds passive. Investment sounds active. The Flywheel reframes fee elimination as a growth strategy, not just cost reduction.",
        commonMistake: "Just saying 'you'll save money.' The Flywheel shows what happens AFTER you save it.",
        howPhrasingPreventsResistance: "Specific numbers and multipliers (2.5x, 2.2x, 1.8x) make it concrete and believable. Lisa's story adds humanity.",
        skipConsequence: "Without the Flywheel, savings feel like a one-time windfall, not ongoing fuel."
      },
      practiceDrill: {
        title: "Flywheel Delivery",
        duration: "3 minutes",
        steps: [
          "Practice the Marketing → Loyalty → Training → Result sequence",
          "Each should feel like a mini-story, not a bullet point",
          "Lisa's line about the certificate should be delivered slowly",
          "End with the $28K/$4K numbers with confidence"
        ],
        roleplayPrompt: "You're skeptical of ROI claims. If the numbers sound believable and the Lisa detail feels human, engage. If it sounds like a marketing pitch, challenge me.",
        badExample: "He reinvested his savings and made more money.",
        goodExample: "The day her cert came in the mail, she stayed an hour late just to hang it. Didn't ask for overtime. Just smiled.",
        aiCoachingPrompt: "I will explain the Profit Flywheel. As a skeptical business owner, evaluate whether the numbers sound realistic and whether Lisa's story adds credibility. Score me 1-10."
      },
      psychologyTag: "Compound Vision",
      whenToUse: "After establishing Mike's struggle, to show what transformation looks like.",
      commonMistakes: "Using round numbers instead of specific ones. Skipping Lisa's emotional moment. Making it sound too good to be true.",
      mechanism: "Cost to Investment Reframe",
    },
    quizzes: [
      {
        question: "What is the Profit Flywheel?",
        type: "multiple_choice",
        options: [
          "A type of equipment",
          "The concept that retained fees become fuel for growth through reinvestment",
          "A marketing program",
          "A loyalty system"
        ],
        correctAnswer: 1,
        explanation: "Savings → Reinvestment → Growth → More Savings. The cycle compounds."
      },
      {
        question: "Why is Lisa's story included in the Flywheel section?",
        type: "multiple_choice",
        options: [
          "To prove training works",
          "To add humanity and emotional resonance to what could be dry numbers",
          "Because she's a real person",
          "To show team building"
        ],
        correctAnswer: 1,
        explanation: "Lisa transforms the Flywheel from math to meaning."
      },
      {
        question: "SCENARIO: A merchant says 'I don't have money for marketing.' How do you respond?",
        type: "multiple_choice",
        options: [
          "'You will once you save on fees.'",
          "'That's exactly the point—the fees you're losing could BE your marketing budget.'",
          "'Marketing isn't required.'",
          "'Most merchants don't.'"
        ],
        correctAnswer: 1,
        explanation: "Connect their constraint directly to the solution."
      }
    ]
  },
  {
    moduleNumber: 5,
    lesson: {
      lessonNumber: 53,
      title: "Counterfactual Fear",
      scriptText: `Now imagine the other version of this story. The version where nothing changes. The leak continues.

Thirteen thousand a year quietly disappears for three more years. That's over forty thousand gone.

No ads. No training. No better tools. No breathing room. Just the same conversation with himself every morning in that truck.

Lisa would've left for a shop that could pay her. Wouldn't have made a scene—just stopped showing up one Monday. Her locker cleaned out by Tuesday.

The good customers would've quietly moved on—not angry, just looking for someone who seemed like they had it together.

And Mike would've blamed himself—believing he just needed to hustle harder—when the real problem was baked into the system.

One day he'd look up and wonder why he's working this hard to feel this stuck. And the worst part? He'd never know it didn't have to be that way.`,
      practicePrompt: "Paint the picture of what happens if nothing changes. Use fear of loss to motivate action without being manipulative.",
      keyQuestions: [
        "Have you ever wondered if you're working hard enough when the real problem might be something structural?",
        "What happens to your best people if you can't invest in them?",
        "Is there a version of your next three years you're trying to avoid?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "Fear of loss is more motivating than hope of gain. The counterfactual makes status quo feel risky, not safe.",
        commonMistake: "Being preachy or manipulative. The tone should be reflective, not scary.",
        howPhrasingPreventsResistance: "'He'd never know it didn't have to be that way' creates the most visceral feeling—the tragedy of not knowing there was another option.",
        skipConsequence: "Without the counterfactual, they can tell themselves 'things are fine.' This makes fine feel dangerous."
      },
      practiceDrill: {
        title: "Counterfactual Delivery",
        duration: "3 minutes",
        steps: [
          "Practice with a reflective, almost sad tone—not aggressive",
          "Lisa leaving should feel like a quiet tragedy, not a drama",
          "The final line should land with weight",
          "Pause after 'He'd never know it didn't have to be that way'"
        ],
        roleplayPrompt: "You're a merchant who has been telling yourself things are fine. If the counterfactual makes you quietly concerned, show it. If it feels manipulative, push back.",
        badExample: "If you don't switch, you'll lose your best employees and go out of business!",
        goodExample: "Lisa would've left. Wouldn't have made a scene—just stopped showing up one Monday. Her locker cleaned out by Tuesday.",
        aiCoachingPrompt: "I will deliver the counterfactual section. As a merchant, tell me if it feels reflective and thought-provoking or manipulative and salesy. Score me 1-10 on tone."
      },
      psychologyTag: "Loss Aversion Activation",
      whenToUse: "After the Flywheel, to contrast transformation with stagnation.",
      commonMistakes: "Being too dramatic or scary. Listing bad outcomes like bullet points instead of telling a story. Forgetting the reflective, sad tone.",
      mechanism: "Fear of Inaction",
    },
    quizzes: [
      {
        question: "Why is fear of loss more motivating than hope of gain?",
        type: "multiple_choice",
        options: [
          "People are naturally negative",
          "Loss aversion—losing feels twice as powerful as gaining",
          "It's easier to understand",
          "It creates urgency"
        ],
        correctAnswer: 1,
        explanation: "Psychological principle: we work harder to avoid losing than to gain."
      },
      {
        question: "What tone should the counterfactual have?",
        type: "multiple_choice",
        options: [
          "Scary and urgent",
          "Reflective and almost sad",
          "Neutral and factual",
          "Excited about the contrast"
        ],
        correctAnswer: 1,
        explanation: "Reflective sadness is more powerful than aggressive fear."
      },
      {
        question: "SCENARIO: A merchant seems uncomfortable during the counterfactual. What do you do?",
        type: "multiple_choice",
        options: [
          "Press harder—they need to feel it",
          "Acknowledge: 'This is heavy, I know. But I share it because I don't want that to be your story.'",
          "Skip ahead quickly",
          "Apologize for being negative"
        ],
        correctAnswer: 1,
        explanation: "Acknowledge the weight, but stand by the message. Care, don't manipulate."
      }
    ]
  },

  // ============================================================================
  // MODULE 6: PROCESS & RISK REVERSAL (Placeholder)
  // ============================================================================
  {
    moduleNumber: 6,
    lesson: {
      lessonNumber: 61,
      title: "Friction Removal",
      scriptText: `Here's how this works—and more importantly, what you DON'T have to do.

You don't have to understand interchange. You don't have to read your current contract. You don't have to cancel anything before we start. You don't even have to make a decision today.

What happens next is simple: We look at your current statement together. I show you exactly what you're paying now and what changes. If it makes sense, we schedule the switch. If not, you've lost nothing but ten minutes.

The paperwork takes about fifteen minutes. Equipment arrives in two to three days. We handle the programming. You're live within a week.`,
      practicePrompt: "Remove friction by explaining what they DON'T have to do. Make the next steps feel simple and low-risk.",
      keyQuestions: [
        "What would make this process feel easier for you?",
        "Do you have your current statement handy?",
        "What's your biggest concern about switching?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They're imagining complexity, contracts, and hassle. Every 'you don't have to' removes a friction point.",
        commonMistake: "Jumping straight to what they DO have to do. Lead with what's NOT required.",
        howPhrasingPreventsResistance: "'You don't even have to make a decision today' removes the pressure they're bracing for.",
        skipConsequence: "Without friction removal, every next step feels like commitment. They'll delay."
      },
      practiceDrill: {
        title: "Friction Removal Sequence",
        duration: "2 minutes",
        steps: [
          "Practice the 'you don't have to' sequence with appropriate pauses",
          "Each statement should land as relief",
          "End with the simple timeline",
          "Make it feel easy, not salesy"
        ],
        roleplayPrompt: "You're worried about complexity and contracts. If the friction removal feels genuine, relax visibly. If it sounds like a setup, stay guarded.",
        badExample: "The process is simple. Here's what you need to do...",
        goodExample: "You don't have to understand interchange. You don't have to read your current contract. You don't have to cancel anything before we start.",
        aiCoachingPrompt: "I will deliver the friction removal section. As a merchant worried about complexity, tell me if it makes the process feel simpler. Score me 1-10."
      },
      psychologyTag: "Process Clarity",
      whenToUse: "After story proof, to show how easy the next steps are.",
      commonMistakes: "Jumping straight to requirements. Not emphasizing the simplicity. Missing the 'no decision today' pressure release.",
      mechanism: "Friction Removal",
    },
    quizzes: [
      {
        question: "Why lead with 'what you DON'T have to do'?",
        type: "multiple_choice",
        options: [
          "It's more interesting",
          "It removes friction points they're imagining",
          "It's shorter",
          "Compliance requires it"
        ],
        correctAnswer: 1,
        explanation: "Every 'you don't have to' removes a barrier they were expecting."
      },
      {
        question: "What does 'You don't even have to make a decision today' accomplish?",
        type: "multiple_choice",
        options: [
          "Delays the sale",
          "Removes pressure and makes them more likely to decide",
          "Shows weakness",
          "Confuses them"
        ],
        correctAnswer: 1,
        explanation: "Removing pressure paradoxically makes commitment easier."
      }
    ]
  },
  {
    moduleNumber: 6,
    lesson: {
      lessonNumber: 62,
      title: "The 90-Day Promise",
      scriptText: `For years, you've taken the risk alone. Equipment that didn't work right. Processors that raised rates. Sales reps who disappeared.

Now the pressure is on us.

For ninety days, if the numbers don't work—if your customers push back more than expected—if you just don't like how it feels—we reverse everything. No penalty. No hard feelings. No 'gotcha' in the fine print.

We can do this because we know what happens. After ninety days, you won't want to go back.`,
      practicePrompt: "Master the 90-Day Promise that reverses the risk. Make commitment feel safe.",
      keyQuestions: [
        "What would make you feel safe trying this?",
        "Have you been burned by contracts before?",
        "What would you need to see in the first 90 days to feel confident?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They've been trapped before. The 90-day promise addresses every flavor of risk concern.",
        commonMistake: "Burying the guarantee in fine print. Make it prominent and powerful.",
        howPhrasingPreventsResistance: "'We reverse everything' is absolute. 'No gotcha in the fine print' addresses their deepest fear.",
        skipConsequence: "Without risk reversal, the fear of being trapped prevents action."
      },
      practiceDrill: {
        title: "90-Day Promise Delivery",
        duration: "2 minutes",
        steps: [
          "Practice 'the pressure is on us' with confidence",
          "List the three 'ifs' with equal weight",
          "Land on 'No gotcha in the fine print' with sincerity",
          "End with quiet confidence: 'You won't want to go back'"
        ],
        roleplayPrompt: "You've been burned by a contract before. If the 90-day promise feels genuine and complete, show relief. If it sounds too good, probe for exceptions.",
        badExample: "We have a satisfaction guarantee.",
        goodExample: "For ninety days, if the numbers don't work—if your customers push back more than expected—if you just don't like how it feels—we reverse everything. No penalty. No hard feelings. No 'gotcha' in the fine print.",
        aiCoachingPrompt: "I will deliver the 90-Day Promise. As a merchant who has been burned before, tell me if it feels complete and genuine. Probe for exceptions. Score me 1-10."
      },
      psychologyTag: "Risk Reversal",
      whenToUse: "When addressing commitment fears. Usually after process explanation.",
      commonMistakes: "Making it sound like fine print. Not being specific about what 'reverse everything' means. Forgetting the confidence close.",
      mechanism: "Risk Reversal",
    },
    quizzes: [
      {
        question: "What does 'No gotcha in the fine print' address?",
        type: "multiple_choice",
        options: [
          "Legal requirements",
          "Their deepest fear about contracts and hidden terms",
          "Competitor comparison",
          "Price objections"
        ],
        correctAnswer: 1,
        explanation: "They've been burned by hidden terms. Address it directly."
      },
      {
        question: "Why end with 'You won't want to go back'?",
        type: "multiple_choice",
        options: [
          "It sounds confident",
          "It shifts from 'can I escape?' to 'will I want to?'",
          "It's shorter",
          "It creates urgency"
        ],
        correctAnswer: 1,
        explanation: "The reframe moves from fear of commitment to confidence in the outcome."
      }
    ]
  },
  {
    moduleNumber: 6,
    lesson: {
      lessonNumber: 63,
      title: "Authority and Compliance",
      scriptText: `PCBancard isn't new to this. We've helped thousands of businesses make this switch.

We work with licensed, compliant terminals that meet all card network requirements. Your setup includes the proper disclosures for your state and business type—so you're protected from day one.

And we're not going anywhere. When you have a question, you'll talk to a real person who knows your account. Not a call center. Not a chatbot. Someone who answers.`,
      practicePrompt: "Establish authority and compliance to address 'can I trust these people?' without sounding boastful.",
      keyQuestions: [
        "What would you need to know about us to feel comfortable?",
        "Have you had support issues with your current processor?",
        "Is compliance something you've worried about?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They're wondering if you're legitimate and if you'll disappear after the sale.",
        commonMistake: "Being too boastful or making claims you can't back up.",
        howPhrasingPreventsResistance: "'Someone who answers' addresses the ghost-after-sale fear directly.",
        skipConsequence: "Without authority elements, trust remains uncertain even if they like the offer."
      },
      practiceDrill: {
        title: "Authority Establishment",
        duration: "2 minutes",
        steps: [
          "Practice the compliance section with calm confidence",
          "Don't oversell—state facts",
          "Land on 'Someone who answers' with genuine commitment",
          "Keep it under 45 seconds"
        ],
        roleplayPrompt: "You've dealt with processors who disappeared after the sale. If the authority section feels trustworthy, nod. If it sounds like every other sales pitch, challenge me.",
        badExample: "We're the best in the industry with amazing support!",
        goodExample: "When you have a question, you'll talk to a real person who knows your account. Not a call center. Not a chatbot. Someone who answers.",
        aiCoachingPrompt: "I will establish authority and compliance. As a skeptical merchant, tell me if I sound trustworthy or like I'm overselling. Score me 1-10."
      },
      psychologyTag: "Credibility + Compliance Shield",
      whenToUse: "After risk reversal, to build institutional trust.",
      commonMistakes: "Overselling or making vague claims. Forgetting the 'someone who answers' commitment. Being too long on credentials.",
      mechanism: "Authority Building",
    },
    quizzes: [
      {
        question: "What does 'Someone who answers' address?",
        type: "multiple_choice",
        options: [
          "Technical support questions",
          "The fear of being ghosted after the sale",
          "Pricing inquiries",
          "Equipment issues"
        ],
        correctAnswer: 1,
        explanation: "They've experienced processors who disappear. Address it directly."
      },
      {
        question: "How long should the authority section take?",
        type: "multiple_choice",
        options: [
          "2-3 minutes",
          "Under 45 seconds",
          "As long as needed",
          "5 minutes"
        ],
        correctAnswer: 1,
        explanation: "Brief authority is more credible than lengthy boasting."
      }
    ]
  },

  // ============================================================================
  // MODULE 7: SOLUTION FIT (Placeholder)
  // ============================================================================
  {
    moduleNumber: 7,
    lesson: {
      lessonNumber: 71,
      title: "In-Store Solution Fit",
      scriptText: `For businesses where customers come to you—restaurants, retail shops, service counters—the setup is a smart terminal right where you ring them up.

The screen shows both prices automatically. Cash price and card price. Customer sees them, picks one, and the transaction runs. No math for you. No explanation needed.

Most setups use a Dejavoo or PAX terminal. Clean screen, fast transactions, built for Dual Pricing. We program it, ship it, and you're live in days.`,
      practicePrompt: "Match in-store businesses with the right countertop solution. Make the technology feel simple and familiar.",
      keyQuestions: [
        "Where do your customers typically pay?",
        "What terminal do you use now?",
        "Do you have counter space for a new terminal?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They're picturing their actual counter and wondering how it works in their space.",
        commonMistake: "Getting too technical about terminal features. Focus on the customer experience.",
        howPhrasingPreventsResistance: "'No math for you. No explanation needed.' removes complexity fears.",
        skipConsequence: "Without solution fit, they can't visualize it working in their business."
      },
      practiceDrill: {
        title: "In-Store Solution Pitch",
        duration: "2 minutes",
        steps: [
          "Describe the terminal setup simply",
          "Focus on what the customer sees and does",
          "Mention specific terminal names for credibility",
          "End with the timeline"
        ],
        roleplayPrompt: "You run a retail shop with a small counter. If the solution sounds practical for your space, engage. If it sounds complicated, ask clarifying questions.",
        badExample: "Our EMV-compliant terminals feature dual-display technology with integrated PIN pads...",
        goodExample: "The screen shows both prices automatically. Customer sees them, picks one, and the transaction runs. No math for you.",
        aiCoachingPrompt: "I will describe the in-store solution. As a retail shop owner, tell me if you can picture this working at your counter. Score me 1-10 on clarity."
      },
      psychologyTag: "Solution Fit",
      whenToUse: "When the merchant has an in-store, counter-based business.",
      commonMistakes: "Getting too technical. Forgetting to mention specific terminal names. Not connecting to their specific business type.",
      mechanism: "Counter/POS Solution Fit",
    },
    quizzes: [
      {
        question: "What should you focus on when describing in-store solutions?",
        type: "multiple_choice",
        options: [
          "Technical specifications",
          "What the customer sees and does",
          "Pricing details",
          "Installation process"
        ],
        correctAnswer: 1,
        explanation: "The customer experience is what matters. Technology should feel invisible."
      },
      {
        question: "Why mention specific terminal names like Dejavoo or PAX?",
        type: "multiple_choice",
        options: [
          "Brand loyalty",
          "It adds credibility and makes the solution concrete",
          "They're the only options",
          "Compliance requires it"
        ],
        correctAnswer: 1,
        explanation: "Specific names make the solution real, not theoretical."
      }
    ]
  },
  {
    moduleNumber: 7,
    lesson: {
      lessonNumber: 72,
      title: "Mobile/Field Solution Fit",
      scriptText: `For businesses that go to the customer—contractors, mobile services, field techs—you need something that works wherever you are.

That could be a mobile terminal that fits in your truck or van. Or it could be your phone with our app. Customer gets a text with both prices, picks one, and pays. Receipt goes to their email.

No internet required at the job site—it works on cellular. And it syncs with your main system when you're back at the shop.`,
      practicePrompt: "Match mobile/field service businesses with the right on-the-go solution. Address connectivity and convenience concerns.",
      keyQuestions: [
        "Where do you usually collect payment—at the job site or back at the shop?",
        "Do you have reliable cell service where you work?",
        "Do you prefer a dedicated terminal or using your phone?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They're picturing themselves at a job site, wondering if this actually works in the field.",
        commonMistake: "Assuming all mobile businesses want the same solution. Ask about their specific workflow.",
        howPhrasingPreventsResistance: "'No internet required—it works on cellular' removes their biggest technical concern.",
        skipConsequence: "Without addressing mobile-specific concerns, field service businesses won't believe it works for them."
      },
      practiceDrill: {
        title: "Mobile Solution Pitch",
        duration: "2 minutes",
        steps: [
          "Describe both options: mobile terminal and phone app",
          "Address connectivity directly",
          "Mention the text-to-pay feature for non-contact",
          "Connect to their specific workflow"
        ],
        roleplayPrompt: "You're a contractor who collects payment at job sites with unreliable wifi. If the solution addresses your concerns, show interest. If it seems like it only works in stores, express doubt.",
        badExample: "Our mobile app integrates with cloud-based payment processing...",
        goodExample: "No internet required at the job site—it works on cellular. Customer gets a text with both prices, picks one, and pays.",
        aiCoachingPrompt: "I will describe the mobile solution. As a field service contractor, tell me if this sounds practical for your work. Score me 1-10."
      },
      psychologyTag: "Mobile/Field Solution Fit",
      whenToUse: "When the merchant goes to the customer (contractors, mobile services, field techs).",
      commonMistakes: "Not addressing connectivity. Assuming they want a physical terminal. Forgetting the sync-with-shop feature.",
      mechanism: "Mobile/Field Solution Fit",
    },
    quizzes: [
      {
        question: "What's the biggest technical concern for mobile/field service businesses?",
        type: "multiple_choice",
        options: [
          "Terminal size",
          "Internet/connectivity at job sites",
          "Receipt printing",
          "Cost"
        ],
        correctAnswer: 1,
        explanation: "Field service happens where wifi isn't reliable. Address it directly."
      },
      {
        question: "What two mobile options should you mention?",
        type: "multiple_choice",
        options: [
          "Desktop terminal and laptop",
          "Mobile terminal and phone app",
          "Cash and card",
          "In-store and online"
        ],
        correctAnswer: 1,
        explanation: "Give them options based on their preference and workflow."
      }
    ]
  },
  {
    moduleNumber: 7,
    lesson: {
      lessonNumber: 73,
      title: "Online/Remote Solution Fit",
      scriptText: `For businesses that take payments remotely—invoicing, phone orders, e-commerce—Dual Pricing works there too.

Invoices show both prices. The customer clicks a link, sees cash price and card price, and picks. If they want to pay by card, they enter their info. If they want to pay by check or bank transfer, they see the cash price.

For phone orders, your team enters the transaction and reads both prices. Customer decides, and you run it.

It all syncs to the same reporting dashboard—so whether payment comes from the counter, the field, or online, you see everything in one place.`,
      practicePrompt: "Match online/remote payment businesses with the right virtual solution. Address invoicing, phone orders, and e-commerce.",
      keyQuestions: [
        "How do you currently send invoices?",
        "Do you take phone orders?",
        "Do you have an e-commerce site?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They're wondering how two prices work when there's no terminal in front of the customer.",
        commonMistake: "Assuming they only need one remote solution. Many businesses use multiple channels.",
        howPhrasingPreventsResistance: "'Everything in one place' addresses the complexity of multiple payment channels.",
        skipConsequence: "Without remote solutions, e-commerce and invoicing businesses don't see themselves in the pitch."
      },
      practiceDrill: {
        title: "Remote Solution Pitch",
        duration: "2 minutes",
        steps: [
          "Cover invoicing, phone orders, and e-commerce",
          "Explain how dual pricing appears in each channel",
          "Emphasize the unified dashboard",
          "Keep it simple—don't get technical"
        ],
        roleplayPrompt: "You send invoices and take phone orders but don't have a physical storefront. If the solution addresses your channels, show interest. If it sounds store-only, express concern.",
        badExample: "Our virtual terminal API integrates with major e-commerce platforms...",
        goodExample: "Invoices show both prices. Customer clicks a link, sees cash price and card price, and picks.",
        aiCoachingPrompt: "I will describe remote payment solutions. As a business that invoices clients, tell me if this sounds practical for your workflow. Score me 1-10."
      },
      psychologyTag: "Remote/E-commerce Solution Fit",
      whenToUse: "When the merchant takes payments remotely (invoicing, phone orders, e-commerce).",
      commonMistakes: "Only mentioning one channel. Getting too technical about integrations. Forgetting the unified dashboard.",
      mechanism: "Remote/E-commerce Solution Fit",
    },
    quizzes: [
      {
        question: "What three remote payment channels should you address?",
        type: "multiple_choice",
        options: [
          "Cash, check, card",
          "Invoicing, phone orders, e-commerce",
          "Morning, afternoon, evening",
          "Retail, wholesale, service"
        ],
        correctAnswer: 1,
        explanation: "Different remote businesses use different channels. Cover the main ones."
      },
      {
        question: "Why mention 'everything in one place'?",
        type: "multiple_choice",
        options: [
          "It's a feature",
          "It addresses the complexity of multiple payment channels",
          "It's shorter",
          "Compliance requires it"
        ],
        correctAnswer: 1,
        explanation: "Multi-channel businesses worry about fragmentation. Address it."
      }
    ]
  },

  // ============================================================================
  // MODULE 8: CLOSING & COMMUNITY (Placeholder)
  // ============================================================================
  {
    moduleNumber: 8,
    lesson: {
      lessonNumber: 81,
      title: "Values Alignment",
      scriptText: `This isn't just about the money—although the money matters.

It's about running your business the way you've always wanted to. Keeping more of what you earn. Investing in your people. Growing on your terms.

The business owners who do best with Dual Pricing share a few things: They're direct with their customers. They believe in fair dealing. They'd rather build something real than cut corners.

If that sounds like you, you're in the right place.`,
      practicePrompt: "Connect the decision to deeper values. Make it about who they are, not just what they save.",
      keyQuestions: [
        "What made you start this business in the first place?",
        "What kind of relationship do you want with your customers?",
        "What would you do with your business if money wasn't the constraint?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They want to feel like they're making a values-aligned decision, not just a financial one.",
        commonMistake: "Keeping it purely transactional. Values create lasting commitment.",
        howPhrasingPreventsResistance: "'If that sounds like you, you're in the right place' creates belonging and pre-qualifies them positively.",
        skipConsequence: "Without values alignment, they may sign but won't become advocates or referrers."
      },
      practiceDrill: {
        title: "Values Connection",
        duration: "2 minutes",
        steps: [
          "Practice connecting savings to deeper purpose",
          "Describe the type of owner who succeeds with Dual Pricing",
          "End with 'If that sounds like you'",
          "Deliver with genuine warmth, not salesiness"
        ],
        roleplayPrompt: "You care about doing right by your customers and employees. If the values section resonates with why you started your business, show connection. If it sounds like marketing, stay neutral.",
        badExample: "You'll save a lot of money with our program!",
        goodExample: "It's about running your business the way you've always wanted to. Keeping more of what you earn. Investing in your people. Growing on your terms.",
        aiCoachingPrompt: "I will deliver the values alignment section. As a business owner with strong values, tell me if it resonates with why you do what you do. Score me 1-10."
      },
      psychologyTag: "Values Alignment",
      whenToUse: "Near the end of the presentation, before the close.",
      commonMistakes: "Keeping it purely transactional. Being too abstract or preachy. Rushing through it.",
      mechanism: "Values Alignment",
    },
    quizzes: [
      {
        question: "Why include values alignment in the presentation?",
        type: "multiple_choice",
        options: [
          "It fills time",
          "Values-aligned decisions create lasting commitment and referrals",
          "It's required",
          "It sounds professional"
        ],
        correctAnswer: 1,
        explanation: "Transactional decisions can be undone. Values-aligned decisions stick."
      },
      {
        question: "What does 'If that sounds like you' accomplish?",
        type: "multiple_choice",
        options: [
          "Qualifies them out",
          "Creates belonging and pre-qualifies them positively",
          "Delays the close",
          "Builds rapport"
        ],
        correctAnswer: 1,
        explanation: "It invites them into a community of like-minded business owners."
      }
    ]
  },
  {
    moduleNumber: 8,
    lesson: {
      lessonNumber: 82,
      title: "Referral Introduction",
      scriptText: `You know how we found you? Probably someone like you told someone like me about a business that might be a fit.

That's how this works. We don't cold call. We don't buy lists. We grow through business owners who've seen the results and want to share them.

If this works for you—if after ninety days you're glad you made the switch—I might ask if you know anyone else who could use the help. Not now. Not until you've seen it for yourself.

But when you're ready, there's a referral program that thanks you for the introduction. It's one more way the relationship keeps giving back.`,
      practicePrompt: "Plant the referral seed without being pushy. Make it feel like a natural part of the relationship, not an ask.",
      keyQuestions: [
        "How did you hear about us?",
        "Do you know other business owners in similar situations?",
        "Would you be open to introductions if this works well for you?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They're wondering if you'll pester them for referrals. Address it before they worry.",
        commonMistake: "Asking for referrals before they've experienced results. It feels presumptuous.",
        howPhrasingPreventsResistance: "'Not now. Not until you've seen it for yourself' removes pressure and builds trust.",
        skipConsequence: "Without planting the seed, they won't think about referrals even when they're happy."
      },
      practiceDrill: {
        title: "Referral Seed Planting",
        duration: "2 minutes",
        steps: [
          "Practice the 'how we found you' origin story",
          "Emphasize 'not now, not until you've seen it'",
          "Mention the referral program without details",
          "Keep it under 45 seconds"
        ],
        roleplayPrompt: "You hate being asked for referrals by salespeople. If the referral section feels respectful and non-pushy, relax. If it feels like a setup, tense up.",
        badExample: "By the way, do you know anyone else who could use this?",
        goodExample: "I might ask if you know anyone else who could use the help. Not now. Not until you've seen it for yourself.",
        aiCoachingPrompt: "I will plant the referral seed. As a merchant who hates referral asks, tell me if this feels respectful or pushy. Score me 1-10."
      },
      psychologyTag: "Referral Seeding",
      whenToUse: "Near the end of the presentation, after values alignment.",
      commonMistakes: "Asking for referrals immediately. Being pushy or transactional. Forgetting to mention the program exists.",
      mechanism: "Referral Introduction",
    },
    quizzes: [
      {
        question: "When should you ask for referrals?",
        type: "multiple_choice",
        options: [
          "Immediately after signing",
          "Not until they've experienced results",
          "Before the presentation",
          "Never"
        ],
        correctAnswer: 1,
        explanation: "Referrals from happy customers are worth 10x. Wait until they're happy."
      },
      {
        question: "What does 'Not now. Not until you've seen it for yourself' accomplish?",
        type: "multiple_choice",
        options: [
          "Delays the ask",
          "Removes pressure and builds trust",
          "Shows weakness",
          "Confuses them"
        ],
        correctAnswer: 1,
        explanation: "Taking the pressure off makes them more likely to refer later."
      }
    ]
  },
  {
    moduleNumber: 8,
    lesson: {
      lessonNumber: 83,
      title: "The Complete Call-to-Action",
      scriptText: `Here's what happens next if you're ready.

We pull your current statement and run the numbers together. Ten minutes, fifteen tops. You'll see exactly what changes and what the savings look like for your specific business.

If it makes sense, we schedule the switch. Equipment arrives in days. We handle the setup. You're live within a week.

If it doesn't make sense—for any reason—you've lost nothing but a few minutes.

So: do you have your statement handy, or should we schedule a time to go through it together?`,
      practicePrompt: "Deliver a clear, low-pressure call-to-action that makes the next step obvious and easy.",
      keyQuestions: [
        "Does that timeline work for you?",
        "Do you have your statement handy?",
        "What questions do you have before we look at the numbers?"
      ],
      whyItWorksEnhanced: {
        merchantMindset: "They need to know exactly what 'yes' looks like. Ambiguity creates delay.",
        commonMistake: "Being vague about next steps or too aggressive in the ask.",
        howPhrasingPreventsResistance: "'If it doesn't make sense, you've lost nothing' makes saying yes feel safe.",
        skipConsequence: "Without a clear CTA, interested merchants don't know how to proceed and momentum dies."
      },
      practiceDrill: {
        title: "Call-to-Action Delivery",
        duration: "2 minutes",
        steps: [
          "Practice the full CTA without rushing",
          "Emphasize the timeline (10-15 minutes, live in a week)",
          "Include the safety valve ('lost nothing but a few minutes')",
          "End with the two options: statement now or schedule"
        ],
        roleplayPrompt: "You're interested but not sure if you're ready. If the CTA feels low-pressure and clear, ask a clarifying question. If it feels pushy, hesitate.",
        badExample: "So, ready to sign up?",
        goodExample: "Do you have your statement handy, or should we schedule a time to go through it together?",
        aiCoachingPrompt: "I will deliver the call-to-action. As an interested but cautious merchant, tell me if you know exactly what to do next. Score me 1-10 on clarity and comfort."
      },
      psychologyTag: "Clear CTA",
      whenToUse: "At the very end of the presentation.",
      commonMistakes: "Being too aggressive. Being too vague. Forgetting the safety valve. Not offering two options.",
      mechanism: "Call-to-Action",
    },
    quizzes: [
      {
        question: "What makes a good call-to-action?",
        type: "multiple_choice",
        options: [
          "Urgency and pressure",
          "Clarity about next steps and low perceived risk",
          "Multiple options to choose from",
          "Discounts for immediate action"
        ],
        correctAnswer: 1,
        explanation: "They need to know exactly what 'yes' looks like and feel safe saying it."
      },
      {
        question: "Why offer two options at the end?",
        type: "multiple_choice",
        options: [
          "Gives them control",
          "Makes 'yes' easier by letting them choose how",
          "Delays the decision",
          "Shows flexibility"
        ],
        correctAnswer: 1,
        explanation: "Choice between two yeses is easier than yes/no."
      }
    ]
  }
];

const masteryQuizzes: { moduleNumber: number; quizzes: Array<{ question: string; type: string; options?: string[]; correctAnswer: number | string; explanation: string }> }[] = [
  {
    moduleNumber: 1,
    quizzes: [
      {
        question: "The presentation is structured as a 'guided discovery' because:",
        type: "multiple_choice",
        options: [
          "It's faster than traditional pitches",
          "Merchants feel in control when they discover problems and solutions themselves",
          "It's required by compliance",
          "It works better for introverted reps"
        ],
        correctAnswer: 1,
        explanation: "Discovery creates ownership. Pitches create resistance."
      },
      {
        question: "When should you mention Dual Pricing in a presentation?",
        type: "multiple_choice",
        options: [
          "In the first 30 seconds to be efficient",
          "After establishing the problem so they have context for why it matters",
          "Never—let them ask about it",
          "Only if they seem interested"
        ],
        correctAnswer: 1,
        explanation: "The problem creates the frame. Without it, the solution is just noise."
      },
      {
        question: "The 8 stages of the presentation in order are: Problem Awareness, Story Proof, Process, Trust, In Store, On The Go, Online, Community",
        type: "multiple_choice",
        options: ["True", "False"],
        correctAnswer: 0,
        explanation: "Memory hint: Problem → Proof → Process → Trust → Fit (3 options) → Community"
      }
    ]
  },
  {
    moduleNumber: 2,
    quizzes: [
      {
        question: "The visceral opening works by hitting the _____ before logical evaluation.",
        type: "multiple_choice",
        options: ["Brain", "Wallet", "Amygdala", "Contract"],
        correctAnswer: 2,
        explanation: "Emotional activation happens in the amygdala. Logic comes later."
      },
      {
        question: "Fee quantification should use precise numbers like $17,412 because:",
        type: "multiple_choice",
        options: [
          "Round numbers work just as well",
          "Precision signals you actually ran the math and is more memorable",
          "It's required by compliance",
          "It sounds more impressive"
        ],
        correctAnswer: 1,
        explanation: "Precise numbers are remembered and believed. '$17,000' is forgettable."
      },
      {
        question: "After the identity activation, the merchant should feel:",
        type: "multiple_choice",
        options: [
          "Guilty about their business practices",
          "Seen, recognized, and affirmed as a capable owner",
          "Pressured to make a decision",
          "Confused about next steps"
        ],
        correctAnswer: 1,
        explanation: "Identity activation says 'I see you.' That recognition builds trust."
      }
    ]
  },
  {
    moduleNumber: 3,
    quizzes: [
      {
        question: "The three-option framework presents: interchange-plus, surcharging, and Dual Pricing",
        type: "multiple_choice",
        options: ["True", "False"],
        correctAnswer: 0,
        explanation: "Interchange-plus → Surcharging → Dual Pricing"
      },
      {
        question: "Surcharging's key limitation is:",
        type: "multiple_choice",
        options: [
          "It's illegal",
          "Customers hate it",
          "You can't surcharge debit cards—federal law",
          "It requires new equipment"
        ],
        correctAnswer: 2,
        explanation: "The debit limitation is why surcharging only plugs PART of the leak."
      },
      {
        question: "'Not everyone qualifies' creates selectivity—they want to be one who qualifies",
        type: "multiple_choice",
        options: ["True", "False"],
        correctAnswer: 0,
        explanation: "Selectivity creates desire."
      }
    ]
  },
  {
    moduleNumber: 4,
    quizzes: [
      {
        question: "The customer reaction fear should be addressed before they voice it—proactively",
        type: "multiple_choice",
        options: ["True", "False"],
        correctAnswer: 0,
        explanation: "Name the fear before they voice it. This demonstrates understanding."
      },
      {
        question: "'First week, he braced for complaints' is included because:",
        type: "multiple_choice",
        options: [
          "Marcus really struggled",
          "It validates their fear before showing resolution",
          "It's honest",
          "All of the above"
        ],
        correctAnswer: 1,
        explanation: "Acknowledging struggle makes resolution credible."
      },
      {
        question: "The 1 in 100 statistic refers to customers who leave due to dual pricing",
        type: "multiple_choice",
        options: ["True", "False"],
        correctAnswer: 0,
        explanation: "Real-world customer attrition from dual pricing."
      }
    ]
  },
  {
    moduleNumber: 5,
    quizzes: [
      {
        question: "Mike is introduced at his lowest point because struggle is relatable",
        type: "multiple_choice",
        options: ["True", "False"],
        correctAnswer: 0,
        explanation: "They identify with the problem first."
      },
      {
        question: "The Profit Flywheel reframes savings as:",
        type: "multiple_choice",
        options: [
          "Cost reduction",
          "Investment fuel for compound growth",
          "One-time windfall",
          "Tax benefit"
        ],
        correctAnswer: 1,
        explanation: "Not just saving money—funding growth."
      },
      {
        question: "The counterfactual should be delivered with what tone?",
        type: "multiple_choice",
        options: [
          "Aggressive urgency",
          "Reflective sadness",
          "Neutral facts",
          "Excitement"
        ],
        correctAnswer: 1,
        explanation: "Sad reflection is more powerful than fear tactics."
      }
    ]
  }
];

export async function seedPresentationData() {
  console.log("Seeding presentation training data...");

  try {
    await db.delete(presentationQuizzes);
    await db.delete(presentationLessons);
    await db.delete(presentationModules);
    console.log("Cleared existing presentation data.");

    const insertedModules = await db.insert(presentationModules).values(modulesData as any).returning();
    console.log(`Inserted ${insertedModules.length} modules.`);

    const moduleIdMap = new Map<number, number>();
    for (const mod of insertedModules) {
      moduleIdMap.set(mod.moduleNumber, mod.id);
    }

    let totalLessons = 0;
    let totalQuizzes = 0;

    for (const lessonData of lessonsData) {
      const moduleId = moduleIdMap.get(lessonData.moduleNumber);
      if (!moduleId) {
        console.warn(`Module ${lessonData.moduleNumber} not found, skipping lesson: ${lessonData.lesson.title}`);
        continue;
      }

      const lessonToInsert: InsertPresentationLesson = {
        ...lessonData.lesson,
        moduleId,
      };

      const [insertedLesson] = await db.insert(presentationLessons).values(lessonToInsert as any).returning();
      totalLessons++;

      if (lessonData.quizzes && lessonData.quizzes.length > 0) {
        const quizzesToInsert: InsertPresentationQuiz[] = lessonData.quizzes.map((quiz, index) => ({
          lessonId: insertedLesson.id,
          question: quiz.question,
          options: quiz.options || [],
          correctIndex: typeof quiz.correctAnswer === 'number' ? quiz.correctAnswer : 0,
          explanation: quiz.explanation,
        }));

        await db.insert(presentationQuizzes).values(quizzesToInsert as any);
        totalQuizzes += quizzesToInsert.length;
      }
    }

    for (const masteryData of masteryQuizzes) {
      const moduleId = moduleIdMap.get(masteryData.moduleNumber);
      if (!moduleId) continue;

      const moduleLessons = lessonsData.filter(l => l.moduleNumber === masteryData.moduleNumber);
      if (moduleLessons.length === 0) continue;

      const firstLessonNumber = moduleLessons[0].lesson.lessonNumber;
      const [firstLesson] = await db.select().from(presentationLessons)
        .where(and(
          eq(presentationLessons.moduleId, moduleId),
          eq(presentationLessons.lessonNumber, firstLessonNumber)
        ))
        .limit(1);

      if (firstLesson) {
        const masteryQuizzesToInsert: InsertPresentationQuiz[] = masteryData.quizzes.map((quiz, index) => ({
          lessonId: firstLesson.id,
          question: `[MASTERY] ${quiz.question}`,
          options: quiz.options || [],
          correctIndex: typeof quiz.correctAnswer === 'number' ? quiz.correctAnswer : 0,
          explanation: quiz.explanation,
        }));

        await db.insert(presentationQuizzes).values(masteryQuizzesToInsert as any);
        totalQuizzes += masteryQuizzesToInsert.length;
      }
    }

    console.log(`Seeding complete: ${totalLessons} lessons, ${totalQuizzes} quizzes inserted.`);
    return { success: true, modules: insertedModules.length, lessons: totalLessons, quizzes: totalQuizzes };
  } catch (error) {
    console.error("Error seeding presentation data:", error);
    throw error;
  }
}
