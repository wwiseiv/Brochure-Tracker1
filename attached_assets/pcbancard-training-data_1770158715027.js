// PCBancard Sales Training Data Module
// This module contains all extracted content from PCBancard's 2026 Sales Process documentation
// Ready for integration into the Field Sales Intelligence Suite

export const pcbancardTrainingData = {
  metadata: {
    version: "2026",
    lastUpdated: "2026-02-03",
    source: "PCBancard 2026 Sales Process from Prospecting to Close",
    sourceUrl: "https://docs.google.com/document/d/1S7U1tH47m2Xi1B9OCp7IHG-6lPD5MTIcS3mMjE11zTI/edit"
  },

  // ============================================
  // CONTACTS & SUPPORT
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
      role: "New Agent Support",
      calendly: "https://calendly.com/schedulepcbancard/rep-appointments-with-emma-2"
    },
    it: {
      names: ["Kenny", "Erik"],
      email: "itdept@pcbancard.com",
      role: "IT and Equipment",
      calendly: "https://calendly.com/kenny-pcb/15min"
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
      hours: "8:30 AM - 5:00 PM EST",
      supportEmail: "support@pcbancard.com",
      generalEmail: "team@pcbancard.com"
    }
  },

  // ============================================
  // SALES PROCESS PHASES
  // ============================================
  salesProcess: {
    phases: [
      {
        id: 1,
        name: "Prospecting",
        title: "Prospect For the Appointment",
        icon: "🎯",
        color: "#7C3AED",
        objective: "Get the appointment scheduled",
        keyActivities: [
          "Drop in with Dual Pricing Flyer or Video Brochure",
          "Set appointment for 15-minute presentation",
          "Enroll prospect in automated email series"
        ]
      },
      {
        id: 2,
        name: "Discovery",
        title: "The Appointment and the Presentation/Discovery",
        icon: "🔍",
        color: "#2563EB",
        objective: "Understand merchant needs and collect processing statement",
        keyActivities: [
          "Ask discovery questions using questionnaires",
          "Walk through Pitch Book and Dual Pricing program",
          "Leave with one-month processing statement",
          "Set appointment to return with proposal"
        ]
      },
      {
        id: 3,
        name: "Proposal & Close",
        title: "The Proposal and the Close",
        icon: "🤝",
        color: "#059669",
        objective: "Present savings and close the deal",
        keyActivities: [
          "Walk through custom proposal showing savings",
          "Compare Traditional, Surcharging, and Dual Pricing",
          "Collect required documents",
          "Complete e-signature application"
        ]
      },
      {
        id: 4,
        name: "Onboarding",
        title: "After the Sale",
        icon: "🚀",
        color: "#DC2626",
        objective: "Successfully onboard merchant",
        keyActivities: [
          "Welcome email sent to merchant",
          "Equipment deployed via 2-day FedEx",
          "IT call for first transaction",
          "PCI compliance completed within 30 days"
        ]
      }
    ]
  },

  // ============================================
  // SCRIPTS & TALK TRACKS
  // ============================================
  scripts: {
    dropInPitch: {
      name: "Jason's Drop-In-The-Door Pitch",
      phase: 1,
      script: `Hi my name is ___. I'm sorry I don't have time to stay long. I'm working with local business owners, helping them eliminate one of their biggest expenses. I just wanted to drop in and see if I could schedule about 15 minutes of your time either ___ at ___ o'clock or ___ at ____ o'clock, which one would work better for you?`,
      tips: [
        "Use alternative choice close for appointment time",
        "Create urgency by mentioning you're working with other businesses",
        "Keep it brief - 30 seconds maximum",
        "Always offer two specific appointment times"
      ],
      variables: ["name", "day1", "time1", "day2", "time2"]
    },
    videoBrochureScript: {
      name: "Video Brochure Script",
      phase: 1,
      script: `Hello, my name is ___. I have just been helping some [industry] business owners in the [area] area. I apologize, but I can't stay long. I have [business A] and [business B] waiting for me to help them. I also understand that you are probably pretty busy. So I can respect your time and see if I can put hundreds, if not thousands back into your bottom line, I would like to leave this Video Brochure with you.

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
      variables: ["name", "industry", "area", "businessA", "businessB", "day1", "time1", "day2", "time2", "appointmentDay", "appointmentTime"]
    },
    statementRequest: {
      name: "Request Processing Statement",
      phase: 2,
      script: `What I would like to do is create a custom proposal for your business showing exactly how much money I can put back into your business each month. I'll do a side-by-side comparison of Traditional Processing, Surcharging and Dual Pricing, and I'll include any equipment costs as well. In order to do that I will need one-month processing statement.`,
      tips: [
        "Position as creating a CUSTOM proposal specifically for their business",
        "Emphasize the value of seeing all three options compared",
        "Only need ONE month of statements",
        "Set the follow-up appointment before leaving"
      ]
    },
    closingScript: {
      name: "Closing Script",
      phase: 3,
      script: `To get you up and running today, I will need a copy of your driver's license, business license, voided check, and processing statements.`,
      tips: [
        "Be direct and assumptive",
        "Have document checklist ready",
        "Text your mentor before the closing call for support",
        "Use the e-signature form for fastest processing"
      ],
      requiredDocuments: [
        "Driver's License",
        "Business License",
        "Voided Check",
        "Processing Statements"
      ]
    }
  },

  // ============================================
  // DISCOVERY QUESTIONNAIRES
  // ============================================
  questionnaires: {
    merchantSurvey: {
      name: "VS/MC Affiliate Merchant Survey",
      downloadUrl: "https://pcbancard.com/wp-content/uploads/2023/11/Merchant-Survey.pdf",
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
    presentationQuestionnaire: {
      name: "Presentation Questionnaire",
      downloadUrl: "https://pcbancard.com/wp-content/uploads/2024/04/Presentation-Questionnaire.pdf",
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
    posQuestionnaire: {
      name: "POS Placement Questionnaire",
      downloadUrl: "https://pcbancard.com/wp-content/uploads/2023/12/POS-questionnaire.pdf",
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
  },

  // ============================================
  // TARGET INDUSTRIES
  // ============================================
  targetIndustries: {
    description: "Best industries for P Series Terminal placement",
    categories: [
      {
        name: "Automotive",
        industries: [
          "Auto repair/auto service/quick lube",
          "Brakes/tires/transmissions",
          "Used Auto Dealers/Dealerships",
          "Large equipment sales/rentals (tractors, wood chippers, bobcats)"
        ]
      },
      {
        name: "Service-Based",
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
        name: "Food & Hospitality",
        industries: [
          "Pizza places and delivery",
          "Food trucks",
          "Liquor Stores",
          "Smoke/cigar shops/novelty stores"
        ]
      },
      {
        name: "Healthcare & Wellness",
        industries: [
          "Chiropractors",
          "Dentists/Oral Surgery",
          "Dental Supply",
          "Dermatologists",
          "Veterinarians/pet boarding/doggie daycare/pet stores",
          "Animal hospitals/emergency clinics",
          "Counseling offices",
          "Lasik Centers/Optometrists",
          "Cosmetic related: botox, augmentation, rhinoplasty"
        ]
      },
      {
        name: "Personal Services",
        industries: [
          "Nail salons/hair salons",
          "Personal trainer/fitness",
          "Massage/day spa"
        ]
      },
      {
        name: "Retail & Specialty",
        industries: [
          "Gun Dealers",
          "Pawn Shops",
          "Garden Centers",
          "Floor coverings/carpet stores/tile stores",
          "Rockeries/Gravel/Mulch/Dirt"
        ]
      },
      {
        name: "B2B & Professional",
        industries: [
          "Attorneys",
          "Daycares/private schools",
          "B2B service providers and suppliers (printers, suppliers, janitorial)",
          "Funeral Homes",
          "City/Government/Treasurers",
          "Sky Diving Company",
          "Tourism related: food trucks, tickets, shows"
        ]
      }
    ]
  },

  // ============================================
  // DUAL PRICING PROGRAM
  // ============================================
  dualPricing: {
    monthlyFee: 64.95,
    iposPaysPortalFee: 10.00,
    totalMonthlyFees: 74.95,
    benefits: [
      {
        benefit: "Eliminate ALL processing fees",
        detail: "Merchants pay $0 to process credit cards - interchange, assessments, everything"
      },
      {
        benefit: "Month-to-month contracts",
        detail: "NO cancellation fees, merchants can leave anytime"
      },
      {
        benefit: "Free terminal equipment",
        detail: "P1 countertop or P3 wireless terminal at no charge with Dual Pricing"
      },
      {
        benefit: "iPOSpays Portal included",
        detail: "Powerful gateway portal for only $10/month"
      },
      {
        benefit: "Customer transparency",
        detail: "Both cash price and card price clearly displayed on terminal and receipt"
      },
      {
        benefit: "Reduce chargebacks",
        detail: "Customers paying cash means no dispute risks"
      },
      {
        benefit: "Give Back Program",
        detail: "Support local charities through a portion of processing"
      },
      {
        benefit: "PCI Compliance done for you",
        detail: "Sign once, we keep you compliant year after year - no penalties"
      },
      {
        benefit: "Next day funding",
        detail: "Fast access to your money"
      },
      {
        benefit: "Access to cash advances",
        detail: "Business funding from $5K - $1 million through RapidFinance partnership"
      }
    ],
    howItWorks: [
      "Software automatically adjusts at point of purchase",
      "No changes required to current operating methods",
      "Card price and cash price clearly displayed",
      "Customer chooses how they want to pay",
      "Merchant pays $0 in processing fees for card transactions"
    ],
    savingsChart: [
      { volume: 25000, monthlySavings: 800, annualSavings: 9600 },
      { volume: 35000, monthlySavings: 1120, annualSavings: 13440 },
      { volume: 45000, monthlySavings: 1440, annualSavings: 17280 },
      { volume: 55000, monthlySavings: 1760, annualSavings: 21120 },
      { volume: 65000, monthlySavings: 2080, annualSavings: 24960 },
      { volume: 75000, monthlySavings: 2400, annualSavings: 28800 },
      { volume: 85000, monthlySavings: 2720, annualSavings: 32640 },
      { volume: 95000, monthlySavings: 3040, annualSavings: 36480 },
      { volume: 105000, monthlySavings: 3360, annualSavings: 40320 },
      { volume: 115000, monthlySavings: 3680, annualSavings: 44160 },
      { volume: 125000, monthlySavings: 4000, annualSavings: 48000 },
      { volume: 135000, monthlySavings: 4320, annualSavings: 51840 },
      { volume: 145000, monthlySavings: 4640, annualSavings: 55680 },
      { volume: 155000, monthlySavings: 4960, annualSavings: 59520 }
    ],
    exampleTransaction: {
      amount: 100,
      traditionalFees: {
        interchangeFees: 0,
        cardProcessingFees: 0,
        cardBrandAssessment: 0,
        iposPaysPortalFee: 10.00,
        programFee: 64.95,
        totalMerchantFees: 74.95
      },
      note: "Merchant pays flat $74.95/month regardless of volume - NO percentage fees"
    }
  },

  // ============================================
  // EQUIPMENT
  // ============================================
  equipment: {
    pSeriesTerminals: {
      p1: {
        name: "Dejavoo P1 iPOSPays Terminal",
        type: "Countertop",
        features: [
          "Accepts Chip, Swipe, Contactless & Tap-To-Pay",
          '5" HD IPS Display',
          "Fast-Speed Printer",
          "PCI PTS Compliant",
          "Ethernet, WiFi, USB Connectivity",
          "Lithium Polymer Battery 7.4V/2600mAh",
          "Quad-Core 1.3GHz CPU",
          "Print, Email, and Text receipts"
        ],
        pricing: "Free with Dual Pricing program"
      },
      p3: {
        name: "Dejavoo P3 Wireless Terminal",
        type: "Wireless",
        features: [
          "4G LTE, WiFi, and Bluetooth Connectivity",
          "All P1 features plus mobility",
          "Ideal for delivery, service calls, events"
        ],
        pricing: "Free with Dual Pricing program"
      }
    },
    posOptions: [
      {
        name: "Cloud POS",
        description: "User-friendly virtual terminal"
      },
      {
        name: "MX POS",
        description: "For restaurant, retail, liquor, grocery, and convenience stores"
      },
      {
        name: "DejaPayPro POS",
        description: "For restaurants and retail shops",
        monthlyFee: 39,
        waivedAt: 25000
      },
      {
        name: "MX POS Station Bundle",
        description: "Station, Pin Pad, Built-In Receipt Printer, Cash Drawer",
        monthlyFee: 99,
        waivedAt: 35000
      }
    ],
    iposPaysGateway: {
      name: "iPOSpays Omni-Commerce Gateway",
      monthlyFee: 10.00,
      features: [
        "Create payment links",
        "Set up recurring payments",
        "Send payment link via text & email",
        "QuickBooks integrations",
        "Venmo, PayPal, Bitcoin, gift cards",
        "Securely stores tokenized and encrypted card data",
        "ACH and Pay by Checking Account",
        "Hosted Payment Page",
        "Tap-to-Pay"
      ],
      portalFeatures: [
        "Centralized reporting through performance dashboard",
        "Real-time transaction monitoring",
        "Transaction void and refund",
        "Batches processing and reports",
        "Customer database management for targeted marketing",
        "Tips after batch - up to 180 days",
        "Remotely settle batches from any device",
        "Built-in database for all customers",
        "Interchange optimization"
      ]
    },
    passport: {
      name: "Passport Fast-Funding",
      description: "Gain immediate access to your funds",
      benefits: [
        "Access to all bank card processing sales within five minutes after batch",
        "Enables immediate funding even on weekends and holidays",
        "Fully automated reconciliation with key data on deposit records",
        "Configurable to work with external bank partners",
        "Passport Debit Card for instant access to batched sales",
        "Priority Capital revenue advances",
        "Easily sweep settled funds into external bank accounts"
      ],
      includedWith: "Every new processing relationship"
    }
  },

  // ============================================
  // ONBOARDING PROCESS
  // ============================================
  onboarding: {
    steps: [
      {
        step: 1,
        name: "Welcome Email & Equipment Deployed",
        activities: [
          {
            actor: "System",
            action: "Merchant receives welcome email from team@pcbancard.com"
          },
          {
            actor: "System",
            action: "Rep receives helpdesk ticket when account is verified (auto-generated)"
          },
          {
            actor: "Kristen/Cori",
            action: "Sends email confirming account officially approved"
          },
          {
            actor: "Office",
            action: "Terminal ships via 2-day FedEx, rep receives helpdesk ticket"
          },
          {
            actor: "System",
            action: "Merchant enrolled in email system for iPOSpays portal setup"
          }
        ],
        billingNotes: [
          "Terminal purchases: Billed 30 days after terminal deployed (not after processing starts)",
          "Gateway/HotSauce/different POS: Billed immediately",
          "Monthly $64.95 Dual Pricing fee extracted first week of each month"
        ]
      },
      {
        step: 2,
        name: "IT Call & First Transaction",
        activities: [
          {
            actor: "System",
            action: "Rep receives helpdesk ticket when terminal delivered"
          },
          {
            actor: "Office",
            action: "Calls rep to see if they want to be present during IT call"
          },
          {
            actor: "Erik (IT)",
            action: "Calls merchant when equipment arrives to run test transaction"
          },
          {
            actor: "IT",
            action: "Puts helpdesk ticket in when completed, rep notified"
          }
        ]
      },
      {
        step: 3,
        name: "PCI Compliance",
        activities: [
          {
            actor: "System",
            action: "Within first 30 days, merchant boarded for PCI compliance"
          },
          {
            actor: "PCBancard",
            action: "If merchant signs PCI form, we complete SAQ for them"
          }
        ],
        pciDetails: {
          benefit: "No non-compliance fees if signed",
          annualFee: 99,
          nonComplianceFee: "Up to $39.95/month if not compliant",
          support: "1-888-543-4743 (Monday-Friday 8:30am-8:00pm ET)"
        }
      }
    ],
    welcomeEmailContent: {
      mxMerchantSetup: [
        "Go to mxmerchant.com",
        "Click Create New User",
        "Enter owner email and click Verify",
        "Click verification link in email",
        "Create and confirm password",
        "Click Continue to sign into merchant portal"
      ],
      portalFeatures: [
        "Reports: ACH Funding, Transaction, Batch, Chargeback reports",
        "Monthly statements: Account > Merchant Services > Statements",
        "Help documents: Help > Docs"
      ],
      signageResources: {
        discover: "www.discoversignage.com",
        visa: "www.merchantsignage.visa.com",
        mastercard: "www.mastercard.com/brandcenter/en/order-decals",
        amex: "www.americanexpress.com/en-us/business/merchant/supplies"
      }
    },
    repBonus: {
      condition: "Merchant is up and processes $300",
      note: "Paid once merchant is active and processing"
    }
  },

  // ============================================
  // EMAIL AUTOMATION SERIES
  // ============================================
  emailAutomation: {
    generalMerchant: {
      name: "General Merchant Email Series",
      enrollmentLink: "https://pcbancard.activehosted.com/f/98",
      emails: [
        { number: 1, topic: "Dual Pricing/Charity Video" },
        { number: 2, topic: "Marketing Services & Cash Advance" },
        { number: 3, topic: "Payroll & PCI Services" }
      ]
    },
    autoShop: {
      name: "Auto Shop Email Series",
      enrollmentLink: "https://pcbancard.activehosted.com/f/95",
      emails: [
        { number: 1, topic: "Auto Shop DP Video + Charity/Benefits" },
        { number: 2, topic: "Marketing Services & Cash Advance" },
        { number: 3, topic: "Payroll & PCI Service" }
      ]
    },
    payroll: {
      name: "Payroll Email Series",
      enrollmentLink: "https://pcbancard.activehosted.com/f/88",
      emails: [
        { number: 1, topic: "Payroll Email #1" },
        { number: 2, topic: "Payroll Email #2" },
        { number: 3, topic: "Payroll Email #3" }
      ]
    },
    iposPaysPortal: {
      name: "iPOSpays Portal Setup",
      enrollmentLink: "https://pcbancard.activehosted.com/f/84"
    }
  },

  // ============================================
  // RESOURCES & LINKS
  // ============================================
  resources: {
    documents: [
      {
        name: "Dual Pricing Flyer (Fillable)",
        url: "https://pcbancard.com/wp-content/uploads/2025/08/Fillable-2025-Updated-Flyers-editable.pdf",
        description: "Drop-in flyer with fillable fields"
      },
      {
        name: "Pitch Book",
        url: "https://pcbancard.com/wp-content/uploads/2025/02/CANVA_proof_II-AZUWPOGGhlwe.pdf",
        description: "Complete sales presentation deck"
      },
      {
        name: "Merchant Survey",
        url: "https://pcbancard.com/wp-content/uploads/2023/11/Merchant-Survey.pdf",
        description: "Discovery questionnaire"
      },
      {
        name: "POS Questionnaire",
        url: "https://pcbancard.com/wp-content/uploads/2023/12/POS-questionnaire.pdf",
        description: "POS-specific discovery questions"
      },
      {
        name: "Presentation Questionnaire",
        url: "https://pcbancard.com/wp-content/uploads/2024/04/Presentation-Questionnaire.pdf",
        description: "Full discovery questionnaire"
      },
      {
        name: "Quick Comparison Example",
        url: "https://pcbancard.com/wp-content/uploads/2023/05/Montelongo-CD-Dan-Santoli.pdf",
        description: "Sample proposal comparison"
      },
      {
        name: "Agent Equipment Book",
        url: "https://pcbancard.com/wp-content/uploads/2023/05/Agent-Equipment-Book-Updated-5-1-2023-1.pdf",
        description: "Complete equipment guide"
      },
      {
        name: "P Line Android Terminals",
        url: "https://pcbancard.com/wp-content/uploads/2023/04/dejavoo-android-terminals_P-Line_aug2022.pdf",
        description: "Dejavoo P Series specifications"
      }
    ],
    videos: [
      {
        name: "Sales Guide Overview",
        url: "https://vimeo.com/1006339886",
        presenter: "Jason",
        description: "How to Use the Sales Guide from Prospecting to Close"
      },
      {
        name: "5-9-4-2-25 Formula",
        url: "https://vimeo.com/1018798318",
        presenter: "Steve Mynhier",
        description: "Follow Steve Mynhier's prospecting formula"
      },
      {
        name: "P3 Promotional Video",
        url: "https://vimeo.com/866928427",
        description: "P3 terminal features and benefits"
      },
      {
        name: "Custom Proposal Video Example",
        url: "https://vimeo.com/1157121019",
        description: "How to present a custom proposal"
      }
    ],
    portals: [
      {
        name: "Partner Training Portal",
        url: "https://pcbancard.com/pcb-partner-training/",
        description: "Main training hub"
      },
      {
        name: "2026 Dual Pricing E-Signature",
        url: "https://forms.pcbancard.com/fill/U4r3mI8EQQ",
        description: "Electronic application form"
      },
      {
        name: "Applications Section",
        url: "https://pcbancard.wpengine.com/partner-training/applications/",
        description: "Paper applications and forms"
      },
      {
        name: "Live Equipment Price Sheet",
        url: "https://docs.google.com/spreadsheets/d/1qCWXeUdTbpUrHYn4fMZ8yZCXbQuqDa5x/edit",
        description: "Current equipment pricing"
      },
      {
        name: "Weekly Prospecting Sheet",
        url: "https://docs.google.com/spreadsheets/d/14ffsPrMJQZDYGXiplSdx0sSI398OjB7Q/edit",
        description: "Track weekly prospecting activities"
      },
      {
        name: "Hardware and Terminals",
        url: "https://pcbancard.wpengine.com/partner-training/hardware-and-terminals/",
        description: "Terminal information and guides"
      }
    ],
    training: [
      {
        name: "Dejavoo Part 1 - Kevin O'Connell",
        url: "http://pcbancard.com/rep-blog-2024/#kevin-oconnell-dejavoo",
        date: "3/12/24"
      },
      {
        name: "Dejavoo Part 2 - iPOSpays Gateway",
        url: "http://pcbancard.com/rep-blog-2024/#ipospays-with-kevin",
        date: "3/18/24"
      }
    ],
    community: {
      facebookGroup: "https://www.facebook.com/groups/782031156418892",
      name: "PCBancard Payments Experts Facebook Group"
    }
  },

  // ============================================
  // FORMULAS & METRICS
  // ============================================
  formulas: {
    mynhierFormula: {
      name: "Steve Mynhier's 5-9-4-2-25 Formula",
      videoUrl: "https://vimeo.com/1018798318",
      metrics: {
        dropInsPerDay: 5,
        contactsPerWeek: 9,
        appointmentsSet: 4,
        dealsClosed: 2,
        weeklyTouches: 25
      },
      description: "Follow this formula consistently for predictable sales results"
    },
    lostDollarFormula: {
      name: "The Formula of a Lost Dollar",
      example: "For every $500 in lost dollars at a 5% net profit, the company must generate an additional $10,000 in new sales to replace its lost profits",
      typicalNetMargin: "10%"
    }
  },

  // ============================================
  // GUARANTEES & POLICIES
  // ============================================
  policies: {
    noMistakesPolicy: {
      name: "60-Day No Mistakes, No Regrets Policy",
      description: "If not happy after statement review, PCBancard will pay up to $150 to program back to former company and close account with no closure fee"
    },
    merchantAssurance: {
      name: "$500 Merchant Assurance Policy",
      description: "Same guarantees apply to both Traditional and Dual Pricing programs"
    },
    monthToMonth: {
      description: "No long-term contracts, no cancellation fees"
    }
  },

  // ============================================
  // QUIZ QUESTIONS FOR TRAINING
  // ============================================
  quizQuestions: [
    {
      question: "What's the monthly Dual Pricing program fee?",
      options: ["$49.95", "$64.95", "$74.95", "$99.95"],
      correctIndex: 1,
      explanation: "The monthly Dual Pricing program fee is $64.95, plus $10 for iPOSpays portal totaling $74.95"
    },
    {
      question: "How many days after terminal deployment is a merchant billed for purchased equipment?",
      options: ["Immediately", "15 days", "30 days", "60 days"],
      correctIndex: 2,
      explanation: "Terminal purchases are billed 30 days after terminal is deployed, not 30 days after processing starts"
    },
    {
      question: "What documents do you need to close a deal?",
      options: [
        "Just the processing statement",
        "Driver's license, business license, voided check, and processing statements",
        "Only a voided check",
        "Social security number and tax returns"
      ],
      correctIndex: 1,
      explanation: "You need all four: driver's license, business license, voided check, and processing statements"
    },
    {
      question: "When does a rep get paid their bonus?",
      options: [
        "When the application is approved",
        "When the merchant is up and processes $300",
        "After 30 days of processing",
        "Immediately upon signing"
      ],
      correctIndex: 1,
      explanation: "The bonus is paid once the merchant is up and running and processes $300"
    },
    {
      question: "What is the iPOSpays Portal monthly fee?",
      options: ["Free", "$10/month", "$25/month", "$64.95/month"],
      correctIndex: 1,
      explanation: "The iPOSpays Portal fee is $10/month"
    },
    {
      question: "How long is the custom proposal turnaround time?",
      options: ["Same day", "24 hours", "48 hours", "1 week"],
      correctIndex: 1,
      explanation: "Custom proposals have a 24-hour turnaround time"
    },
    {
      question: "What shipping method is used for terminals?",
      options: ["USPS Ground", "2-day FedEx", "7-day standard", "Customer pickup"],
      correctIndex: 1,
      explanation: "Terminals are shipped via 2-day FedEx"
    },
    {
      question: "Within how many days must PCI compliance be completed?",
      options: ["15 days", "30 days", "60 days", "90 days"],
      correctIndex: 1,
      explanation: "PCI compliance should be completed within the first 30 days after approval"
    },
    {
      question: "What is the annual PCI fee when PCBancard handles compliance?",
      options: ["Free", "$49", "$99", "$199"],
      correctIndex: 2,
      explanation: "The annual PCI fee is $99 when the merchant signs the form and PCBancard handles compliance"
    },
    {
      question: "According to the 5-9-4-2-25 formula, how many drop-ins should you do per day?",
      options: ["3", "5", "7", "10"],
      correctIndex: 1,
      explanation: "The formula calls for 5 drop-ins per day"
    }
  ]
};

// Export individual sections for modular use
export const { 
  contacts, 
  salesProcess, 
  scripts, 
  questionnaires, 
  targetIndustries,
  dualPricing,
  equipment,
  onboarding,
  emailAutomation,
  resources,
  formulas,
  policies,
  quizQuestions 
} = pcbancardTrainingData;

export default pcbancardTrainingData;
