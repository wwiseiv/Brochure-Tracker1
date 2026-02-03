// PCBancard 2026 Sales Process Knowledge Base
// Comprehensive training content for AI coaching integration
// Source: https://docs.google.com/document/d/1S7U1tH47m2Xi1B9OCp7IHG-6lPD5MTIcS3mMjE11zTI/edit

export interface SalesPhase {
  id: number;
  name: string;
  title: string;
  objective: string;
  keyActivities: string[];
  scripts: Script[];
  tips: string[];
  resources: Resource[];
}

export interface Script {
  name: string;
  content: string;
  tips: string[];
  variables?: string[];
}

export interface Resource {
  name: string;
  url: string;
  type: 'document' | 'video' | 'form' | 'portal';
}

export interface ObjectionHandler {
  objection: string;
  responses: string[];
  tips: string[];
}

export interface DiscoveryQuestion {
  category: string;
  questions: string[];
}

export const salesProcessKnowledge = {
  metadata: {
    version: "2026",
    lastUpdated: "2026-02-03",
    title: "2026 Sales Process from Prospecting to Close",
    source: "https://docs.google.com/document/d/1S7U1tH47m2Xi1B9OCp7IHG-6lPD5MTIcS3mMjE11zTI/edit"
  },

  // ============================================
  // KEY CONTACTS
  // ============================================
  contacts: {
    salesManager: {
      name: "Jason",
      email: "avar@pcbancard.com",
      phone: "(317) 750-9108",
      role: "Sales Manager",
      calendly: "https://calendly.com/pcbancard/30min-1on1"
    },
    newAgentSupport: {
      name: "Emma",
      email: "emma@pcbancard.com",
      phone: "(973) 768-2231",
      role: "New Agent Support"
    },
    it: {
      names: ["Kenny", "Erik"],
      email: "itdept@pcbancard.com",
      role: "IT and Equipment"
    },
    office: {
      names: ["Kristen", "Cori"],
      email: "office@pcbancard.com",
      role: "Office Manager/Applications"
    },
    proposals: {
      email: "proposals@pcbancard.com",
      turnaround: "24 hours"
    },
    mainOffice: {
      phone: "(973) 324-2251",
      hours: "8:30 AM - 5:00 PM EST"
    }
  },

  // ============================================
  // SALES PHASES
  // ============================================
  phases: [
    {
      id: 1,
      name: "Prospecting",
      title: "Prospect For the Appointment",
      objective: "Get the appointment scheduled",
      keyActivities: [
        "Drop in with Dual Pricing Flyer or Video Brochure",
        "Use Jason's drop-in-the-door pitch",
        "Set appointment for 15-minute presentation",
        "Enroll prospect in automated email series"
      ],
      scripts: [
        {
          name: "Jason's Drop-In-The-Door Pitch",
          content: `Hi my name is ___. I'm sorry I don't have time to stay long. I'm working with local business owners, helping them eliminate one of their biggest expenses. I just wanted to drop in and see if I could schedule about 15 minutes of your time either ___ at ___ o'clock or ___ at ____ o'clock, which one would work better for you?`,
          tips: [
            "Use alternative choice close for appointment time",
            "Create urgency by mentioning you're working with other businesses",
            "Keep it brief - 30 seconds maximum",
            "Always offer two specific appointment times"
          ],
          variables: ["name", "day1", "time1", "day2", "time2"]
        },
        {
          name: "Video Brochure Script",
          content: `Hello, my name is ___. I have just been helping some [industry] business owners in the [area] area. I apologize, but I can't stay long. I have [business A] and [business B] waiting for me to help them. I also understand that you are probably pretty busy. So I can respect your time and see if I can put hundreds, if not thousands back into your bottom line, I would like to leave this Video Brochure with you.

All I ask is that you take a quick look inside when you have 5 free minutes. Does that sound fair to you?

I'm going to be back in the area either (day) at (time) or (day) at (time). Which one is usually best for you so I can answer any questions you may have? I recommend watching the first short video, and if you want to learn more, there are 6 other videos with information. Here are the buttons.

Thank you. I will see you on ___ at ___.`,
          tips: [
            "Mention specific industry to build relevance",
            "Create social proof by naming other businesses you're helping",
            "Leave the video brochure for them to review",
            "Set specific callback appointment before leaving",
            "Point out the video buttons and recommend starting with the first one"
          ],
          variables: ["name", "industry", "area", "businessA", "businessB", "day1", "time1", "day2", "time2"]
        }
      ],
      tips: [
        "Get out there and talk to merchants in person - this is the most important thing",
        "Use the 3-part email series between drop-in and discovery appointment",
        "Always leave with a specific appointment time"
      ],
      resources: [
        { name: "Dual Pricing Flyer", url: "https://pcbancard.com/wp-content/uploads/2025/08/Fillable-2025-Updated-Flyers-editable.pdf", type: "document" },
        { name: "Video Guide from Jason", url: "https://vimeo.com/1006339886", type: "video" },
        { name: "5-9-4-2-25 Formula (Steve Mynhier)", url: "https://vimeo.com/1018798318", type: "video" }
      ]
    },
    {
      id: 2,
      name: "Discovery",
      title: "The Appointment and the Presentation/Discovery",
      objective: "Understand merchant needs and collect processing statement",
      keyActivities: [
        "Ask discovery questions using questionnaires",
        "Walk through Pitch Book and Dual Pricing program",
        "Leave with one-month processing statement",
        "Set appointment to return with proposal"
      ],
      scripts: [
        {
          name: "Request Processing Statement",
          content: `What I would like to do is create a custom proposal for your business showing exactly how much money I can put back into your business each month. I'll do a side-by-side comparison of Traditional Processing, Surcharging and Dual Pricing, and I'll include any equipment costs as well. In order to do that I will need one-month processing statement.`,
          tips: [
            "Position as creating a CUSTOM proposal specifically for their business",
            "Emphasize the value of seeing all three options compared",
            "Only need ONE month of statements",
            "Set the follow-up appointment before leaving"
          ]
        }
      ],
      tips: [
        "Use Merchant Survey, POS Questionnaire, or Presentation Questionnaire",
        "Take detailed notes during discovery",
        "Have your Pitch Book handy to walk through Dual Pricing program",
        "If merchant wants to close during presentation, call Jason or your mentor"
      ],
      resources: [
        { name: "Merchant Survey", url: "https://pcbancard.com/wp-content/uploads/2023/11/Merchant-Survey.pdf", type: "document" },
        { name: "POS Questionnaire", url: "https://pcbancard.com/wp-content/uploads/2023/12/POS-questionnaire.pdf", type: "document" },
        { name: "Presentation Questionnaire", url: "https://pcbancard.com/wp-content/uploads/2024/04/Presentation-Questionnaire.pdf", type: "document" },
        { name: "Pitch Book", url: "https://pcbancard.com/wp-content/uploads/2025/02/CANVA_proof_II-AZUWPOGGhlwe.pdf", type: "document" }
      ]
    },
    {
      id: 3,
      name: "Proposal & Close",
      title: "The Proposal and the Close",
      objective: "Present savings and close the deal",
      keyActivities: [
        "Walk through custom proposal showing savings",
        "Compare Traditional, Surcharging, and Dual Pricing",
        "Collect required documents",
        "Complete e-signature application"
      ],
      scripts: [
        {
          name: "Closing Script",
          content: `To get you up and running today, I will need a copy of your driver's license, business license, voided check, and processing statements.`,
          tips: [
            "Be direct and assumptive",
            "Have document checklist ready",
            "Text your mentor before the closing call for support",
            "Use the e-signature form for fastest processing"
          ]
        },
        {
          name: "Option Close",
          content: `Mr./Mrs. Merchant, which direction would you like to go? Like I said I can lower your rates and save you $50, $100 or we can eliminate your fees by implementing our Dual Pricing Program. Which program would you like to move forward with?`,
          tips: [
            "Give merchant two options - neither being NO",
            "Position as helping them choose the best option",
            "Always have traditional processing as backup"
          ]
        }
      ],
      tips: [
        "Text your mentor before closing call so they can assist",
        "Walk through the proposal showing exact savings",
        "Use the 2026 Dual Pricing e-signature form",
        "You will be paid your bonus once merchant processes $300"
      ],
      resources: [
        { name: "Quick Comparison Example", url: "https://pcbancard.com/wp-content/uploads/2023/05/Montelongo-CD-Dan-Santoli.pdf", type: "document" },
        { name: "Custom Proposal Video", url: "https://vimeo.com/1157121019", type: "video" },
        { name: "2026 Dual Pricing E-Signature", url: "https://forms.pcbancard.com/fill/U4r3mI8EQQ", type: "form" },
        { name: "Tips to Closing More Deals", url: "https://docs.google.com/document/d/1DrK6atp0aJ0YhQY-5EK2qqd9_vJ-IY84", type: "document" }
      ]
    },
    {
      id: 4,
      name: "Onboarding",
      title: "After the Sale",
      objective: "Successfully onboard merchant",
      keyActivities: [
        "Merchant receives welcome email from team@pcbancard.com",
        "Terminal shipped via 2-day FedEx",
        "IT call for first transaction setup",
        "PCI compliance completed within 30 days"
      ],
      scripts: [],
      tips: [
        "Terminal purchases billed 30 days after deployment",
        "Gateway/HotSauce billed immediately",
        "$64.95 Dual Pricing fee extracted first week of each month",
        "Annual $99 PCI fee only if they sign PCI form"
      ],
      resources: [
        { name: "iPOSpays Portal Setup", url: "https://pcbancard.activehosted.com/f/84", type: "portal" },
        { name: "Partner Training Portal", url: "https://pcbancard.com/pcb-partner-training/", type: "portal" }
      ]
    }
  ] as SalesPhase[],

  // ============================================
  // DISCOVERY QUESTIONS
  // ============================================
  discoveryQuestions: [
    {
      category: "Merchant Survey",
      questions: [
        "How long have you been with your current processor?",
        "What do you like about your current processor?",
        "What do you wish you could change about your current processor?",
        "What are 2 things you do not like about credit card processing in general?",
        "Do you still pay processing fees?",
        "How long does it take for your transactions to hit your bank account?",
        "Does your current processor give you the ability to make money off paying your vendors?",
        "Does your current processor offer you access to capital if and when you may need it?",
        "How often do you see or hear from your current processor?",
        "What would it take for you to make a change in your processing?"
      ]
    },
    {
      category: "Presentation Questionnaire",
      questions: [
        "How long have you been in business?",
        "How are you accepting payments right now (terminal, POS, gateway, etc.)?",
        "What do you like and/or dislike about your equipment?",
        "Are you interested in updated equipment?",
        "Who are you processing with as of now?",
        "What do you like and/or dislike about them?",
        "How long does it take for you to receive your funds (next day, 2 day, 4 days, etc.)?",
        "If you could change something you were doing with accepting cards, what would it be?",
        "Roughly, how much do you pay in fees per month to accept cards?",
        "If you need access to cash, do you have that ability through your processor?",
        "Are you interested in lowering your monthly fees or ELIMINATING them completely?",
        "What are 2 things you would like to do to grow your business?",
        "Why haven't you been able to do this yet?",
        "If I could show you a way to do these things, do you think it would make sense for us to do business together?",
        "Do you have any local charities that you would like to help through our Give Back Program, if it didn't come out of your pocket?",
        "Anything else I really need to know about your business or how you are processing cards?"
      ]
    },
    {
      category: "POS Questionnaire",
      questions: [
        "Restaurant or Retail?",
        "How many menu items do you have?",
        "How many stations are you looking for?",
        "Are you interested in 'Order at the table'?",
        "Are you interested in 'Pay at the table'?",
        "Are you interested in 'Table QR Code ordering'?",
        "Are you interested in 'Tablet' solutions?",
        "Will the POS System be hard-wired or WIFI?",
        "How many kitchen printers are needed?",
        "Any special instructions or requests?"
      ]
    }
  ] as DiscoveryQuestion[],

  // ============================================
  // OBJECTION HANDLING
  // ============================================
  objectionHandling: [
    {
      objection: "I don't want to charge my customers more / I don't think my customers will like it",
      responses: [
        `I can tell you that only about 1 out of every 50 business owners who implement this program find it's not the right fit. That's only about 2% of the time. It's important for you to know, you could be that 2%. We SHOULD talk about that. Obviously, I don't think you're going to be that 2%. But, let's assume you are. Here's what will happen...`,
        `Mr./Mrs. Merchant, we have partnered with Darren Waller Foundation which is a non-profit organization. We provide you with this flyer to put up next to your signage. A portion of that service fee goes back to your community. Now your customers understand that this fee is not just helping the business owner, but helping their local community.`,
        `Mr./Mrs. Merchant, it looks like you are paying roughly $2000 per month in fees. Let me guess, you may make about $5-$10 profit off a customer? So how many customers would you have to lose to make up for the $2000 per month I am saving you? It is all about the bottom line profit, correct?`,
        `Mr./Mrs. Merchant, VS/MC rates have gone up for 4 straight months now and VS has already said they are going to continue to raise their rates. This means for 4 months you have made less profit on each sale. What options do you have when they continue to rise? You either raise all your prices or do Dual Pricing. What is going to be better?`
      ],
      tips: [
        "Acknowledge their concern genuinely",
        "Use the charity angle (Give Back Program) to reframe the fee",
        "Focus on bottom line profit, not customer perception",
        "Offer to provide references from successful merchants"
      ]
    },
    {
      objection: "I don't want to be the first/only one to do it around here",
      responses: [
        `I can understand that. I have talked with a few other businesses in the area that contacted me about our program and I think they are having the same reservation as you. How about this: I get 5 other businesses in the area that have the same fear and have them agree to start the program all together, and then it becomes the norm? Would that make it easier?`,
        `Mr./Mrs. Merchant, your competition runs the Dual Pricing program and you have to raise your prices, that doesn't work we can both agree, right?`,
        `Do you think that if your customers knew that a portion of this fee was going back to their/YOUR community, it would make it easier? We have partnered with Chef's Feeding Kids. A portion of this 3.99% actually goes back to your local organization to help feed kids in need.`
      ],
      tips: [
        "Offer to coordinate with other local businesses",
        "Frame it as becoming the norm in the area",
        "Use the charity angle to differentiate"
      ]
    },
    {
      objection: "I'm going to stay where I am for now",
      responses: [
        `I'm giving you my word – my personal guarantee – if this program negatively impacts your business in any way and you feel like it's not a good cost exchange (keep in mind, there's a 98% chance that's not going to happen), I will drive out here the same day if needed. I'll swap that terminal, turn off that feature, or whatever I need to do to get you back to traditional processing. I'll take care of it, so there won't be any lasting issues. If I'm personally willing to give you my guarantee and knowing you have a 98% chance of saving all that money, are you at least willing to give it a chance?`
      ],
      tips: [
        "Offer a personal guarantee",
        "Make them say NO to you, not just to the program",
        "Remind them there are no ETFs or long-term contracts"
      ]
    }
  ] as ObjectionHandler[],

  // ============================================
  // CLOSING TIPS
  // ============================================
  closingTips: [
    {
      category: "Opening the Conversation",
      tips: [
        `Make the program relatable: "Mr./Mrs Merchant, I am sure in the past that you have had to do price increases because of expenses rising from vendors, landlords raising leases, utilities increasing, etc right? And during that first week or 2 when you did so, you would have a few people complain and moan about it, and then after that week or so, business went back to normal. This is the same thing."`,
        "Position it as offsetting card costs rather than charging customers more",
        "Remind them VS/MC rates have increased 4 straight months"
      ]
    },
    {
      category: "What REALLY Works",
      tips: [
        "Use references - have the merchant call other merchants doing the program",
        "FOLLOW UP! 2-3 times is normal - change is hard for everyone",
        "Just get them to TRY the program - no ETFs, month-to-month",
        "When you see a business doing Dual Pricing, talk to the owner about their experience",
        "Use the Option Close - give two choices, neither being NO",
        "GET OUT THERE AND TALK TO MERCHANTS IN PERSON - this is the most important thing"
      ]
    },
    {
      category: "Using the Charity Angle",
      tips: [
        "Mention partnership with Darren Waller Foundation or Chef's Feeding Kids",
        "Offer the charity flyer to put next to their signage",
        "Position the fee as giving back to the community",
        "Customers feel better knowing part of the fee helps local causes"
      ]
    },
    {
      category: "The Two Proposal Strategy",
      tips: [
        "Prepare two written proposals - Dual Pricing and Traditional",
        "Dual Pricing: $64.95/month flat regardless of volume",
        "Traditional: At-cost rates as a thank you for trying the program",
        "Let them choose which approach they're more comfortable with"
      ]
    }
  ],

  // ============================================
  // TARGET INDUSTRIES
  // ============================================
  targetIndustries: [
    {
      category: "Automotive",
      industries: [
        "Auto repair/auto service/quick lube",
        "Brakes/tires/transmissions",
        "Used Auto Dealers/Dealerships",
        "Large equipment sales/rentals (tractors, wood chippers, bobcats)"
      ]
    },
    {
      category: "Service-Based",
      industries: [
        "HVAC",
        "Plumbers",
        "Lawncare/Landscaping",
        "Painters",
        "Audio/Video installation",
        "Dry Cleaners/Laundry services",
        "Dog Groomer"
      ]
    },
    {
      category: "Food & Hospitality",
      industries: [
        "Pizza places and delivery",
        "Food trucks",
        "Liquor Stores",
        "Smoke/cigar shops/novelty stores"
      ]
    },
    {
      category: "Healthcare & Wellness",
      industries: [
        "Chiropractors",
        "Dentists/Oral Surgery",
        "Dental Supply",
        "Dermatologists",
        "Veterinarians/pet boarding/doggie daycare/pet stores",
        "Animal hospitals/emergency clinics",
        "Counseling offices",
        "Lasik Centers/Optometrists",
        "Cosmetic: botox, augmentation, rhinoplasty"
      ]
    },
    {
      category: "Personal Services",
      industries: [
        "Nail salons/hair salons",
        "Personal trainer/fitness",
        "Massage/day spa"
      ]
    },
    {
      category: "Retail & Specialty",
      industries: [
        "Gun Dealers",
        "Pawn Shops",
        "Garden Centers",
        "Floor coverings/carpet stores/tile stores",
        "Rockeries/Gravel/Mulch/Dirt"
      ]
    },
    {
      category: "B2B & Professional",
      industries: [
        "Attorneys",
        "Daycares/private schools",
        "B2B service providers (printers, suppliers, janitorial)",
        "Funeral Homes",
        "City/Government/Treasurers",
        "Sky Diving Company"
      ]
    }
  ],

  // ============================================
  // DUAL PRICING BENEFITS
  // ============================================
  dualPricingBenefits: [
    { benefit: "Eliminate ALL processing fees", detail: "Merchants pay $0 to process credit cards - only $64.95/month flat" },
    { benefit: "Month-to-month contracts", detail: "NO cancellation fees or long-term commitments" },
    { benefit: "Free terminal equipment", detail: "P1 or P3 terminal at no charge" },
    { benefit: "iPOSpays Portal included", detail: "Only $10/month for gateway" },
    { benefit: "Customer transparency", detail: "Both cash and card prices clearly displayed" },
    { benefit: "Give Back Program", detail: "Support local charities through processing" },
    { benefit: "PCI Compliance done for you", detail: "Sign once, we keep you compliant - only $99/year" },
    { benefit: "Next-day funding available", detail: "Fast access to your money" },
    { benefit: "Access to capital", detail: "Cash advances available when needed" }
  ],

  // ============================================
  // EMAIL SERIES
  // ============================================
  emailSeries: [
    {
      name: "General Merchant Series",
      signupUrl: "https://pcbancard.activehosted.com/f/98",
      emails: [
        "Email #1: Dual Pricing/Charity Video",
        "Email #2: Marketing Services & Cash Advance",
        "Email #3: Payroll & PCI Services"
      ]
    },
    {
      name: "Auto Shop Series",
      signupUrl: "https://pcbancard.activehosted.com/f/95",
      emails: [
        "Email #1: Auto Shop DP Video + Charity/Benefits",
        "Email #2: Marketing Services & Cash Advance",
        "Email #3: Payroll & PCI Service"
      ]
    },
    {
      name: "Payroll Series",
      signupUrl: "https://pcbancard.activehosted.com/f/88",
      emails: [
        "Payroll Email #1",
        "Payroll Email #2",
        "Payroll Email #3"
      ]
    }
  ],

  // ============================================
  // KEY RESOURCES
  // ============================================
  resources: {
    documents: [
      { name: "Dual Pricing Flyer", url: "https://pcbancard.com/wp-content/uploads/2025/08/Fillable-2025-Updated-Flyers-editable.pdf", type: "document" as const },
      { name: "Pitch Book", url: "https://pcbancard.com/wp-content/uploads/2025/02/CANVA_proof_II-AZUWPOGGhlwe.pdf", type: "document" as const },
      { name: "Merchant Survey", url: "https://pcbancard.com/wp-content/uploads/2023/11/Merchant-Survey.pdf", type: "document" as const },
      { name: "POS Questionnaire", url: "https://pcbancard.com/wp-content/uploads/2023/12/POS-questionnaire.pdf", type: "document" as const },
      { name: "Presentation Questionnaire", url: "https://pcbancard.com/wp-content/uploads/2024/04/Presentation-Questionnaire.pdf", type: "document" as const },
      { name: "Quick Comparison Example", url: "https://pcbancard.com/wp-content/uploads/2023/05/Montelongo-CD-Dan-Santoli.pdf", type: "document" as const },
      { name: "Agent Equipment Book", url: "https://pcbancard.com/wp-content/uploads/2023/05/Agent-Equipment-Book-Updated-5-1-2023-1.pdf", type: "document" as const }
    ],
    videos: [
      { name: "Sales Guide Overview (Jason)", url: "https://vimeo.com/1006339886", type: "video" as const },
      { name: "5-9-4-2-25 Formula (Steve Mynhier)", url: "https://vimeo.com/1018798318", type: "video" as const },
      { name: "P3 Promotional Video", url: "https://vimeo.com/866928427", type: "video" as const },
      { name: "Custom Proposal Video Example", url: "https://vimeo.com/1157121019", type: "video" as const }
    ],
    portals: [
      { name: "Partner Training Portal", url: "https://pcbancard.com/pcb-partner-training/", type: "portal" as const },
      { name: "2026 Dual Pricing E-Signature", url: "https://forms.pcbancard.com/fill/U4r3mI8EQQ", type: "form" as const },
      { name: "Live Price Sheet", url: "https://docs.google.com/spreadsheets/d/1qCWXeUdTbpUrHYn4fMZ8yZCXbQuqDa5x/edit", type: "document" as const },
      { name: "Weekly Prospecting Sheet", url: "https://docs.google.com/spreadsheets/d/14ffsPrMJQZDYGXiplSdx0sSI398OjB7Q/edit", type: "document" as const }
    ]
  },

  // ============================================
  // ONBOARDING STEPS
  // ============================================
  onboardingSteps: [
    {
      step: 1,
      title: "Welcome Email & Equipment Deployed",
      details: [
        "Merchant receives welcome email from team@pcbancard.com",
        "Rep gets helpdesk ticket when account is verified",
        "Kristen or Cori confirms official approval",
        "Terminal ships via 2-day FedEx",
        "Merchant enrolled in email system for iPOSpays portal setup",
        "Billing: Terminal purchases billed 30 days after deployment",
        "Gateway/HotSauce billed immediately"
      ]
    },
    {
      step: 2,
      title: "IT Call & First Transaction",
      details: [
        "Rep receives helpdesk ticket when terminal delivered",
        "Office calls rep to coordinate IT call timing",
        "Erik calls merchant to run test transaction",
        "IT completes setup and logs helpdesk ticket",
        "Rep notified via email when complete"
      ]
    },
    {
      step: 3,
      title: "PCI Compliance",
      details: [
        "Within 30 days of approval, merchant boarded for PCI compliance",
        "If merchant signs PCI form, we complete it for them",
        "No non-compliance fees with signed form",
        "Annual $99 PCI fee only",
        "Monthly $64.95 Dual Pricing fee extracted first week of each month"
      ]
    }
  ],

  // ============================================
  // KEY PRICING INFO
  // ============================================
  pricing: {
    dualPricingFee: "$64.95/month",
    pciAnnualFee: "$99/year",
    gatewayFee: "$10/month",
    terminalBilling: "30 days after deployment",
    bonusPayment: "After merchant processes $300",
    proposalTurnaround: "24 hours"
  }
};

// Helper function to get phase by name
export function getPhaseByName(name: string): SalesPhase | undefined {
  return salesProcessKnowledge.phases.find(
    p => p.name.toLowerCase() === name.toLowerCase()
  );
}

// Helper function to get all scripts
export function getAllScripts(): Script[] {
  return salesProcessKnowledge.phases.flatMap(p => p.scripts);
}

// Helper function to get objection handlers
export function getObjectionHandler(keyword: string): ObjectionHandler | undefined {
  return salesProcessKnowledge.objectionHandling.find(
    o => o.objection.toLowerCase().includes(keyword.toLowerCase())
  );
}

// Helper function to format phase for AI context
export function formatPhaseForAI(phase: SalesPhase): string {
  let text = `## Phase ${phase.id}: ${phase.name}\n`;
  text += `**Objective:** ${phase.objective}\n\n`;
  text += `**Key Activities:**\n${phase.keyActivities.map(a => `- ${a}`).join('\n')}\n\n`;
  
  if (phase.scripts.length > 0) {
    text += `**Scripts:**\n`;
    phase.scripts.forEach(s => {
      text += `\n### ${s.name}\n"${s.content}"\n`;
      text += `Tips: ${s.tips.join('; ')}\n`;
    });
  }
  
  if (phase.tips.length > 0) {
    text += `\n**Tips:**\n${phase.tips.map(t => `- ${t}`).join('\n')}\n`;
  }
  
  return text;
}

// Helper function to get full knowledge base as text for AI
export function getSalesProcessKnowledgeText(): string {
  let text = `# PCBancard 2026 Sales Process from Prospecting to Close\n\n`;
  
  // Phases
  salesProcessKnowledge.phases.forEach(phase => {
    text += formatPhaseForAI(phase) + '\n\n';
  });
  
  // Objection Handling
  text += `## Objection Handling\n\n`;
  salesProcessKnowledge.objectionHandling.forEach(obj => {
    text += `### "${obj.objection}"\n`;
    text += `**Responses:**\n${obj.responses.map(r => `- ${r}`).join('\n\n')}\n`;
    text += `**Tips:** ${obj.tips.join('; ')}\n\n`;
  });
  
  // Closing Tips
  text += `## Closing Tips\n\n`;
  salesProcessKnowledge.closingTips.forEach(cat => {
    text += `### ${cat.category}\n`;
    text += cat.tips.map(t => `- ${t}`).join('\n') + '\n\n';
  });
  
  // Benefits
  text += `## Dual Pricing Benefits\n\n`;
  salesProcessKnowledge.dualPricingBenefits.forEach(b => {
    text += `- **${b.benefit}**: ${b.detail}\n`;
  });
  
  return text;
}
