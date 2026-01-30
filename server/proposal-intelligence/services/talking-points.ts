import type { AnalysisResult } from "./statement-analysis";

export interface TalkingPoints {
  opening: string;
  keyFacts: string[];
  redFlagScripts: Array<{ issue: string; script: string; severity?: string; impact?: string }>;
  questions: string[];
  objections: Record<string, { objection: string; response: string }>;
  valueProps: Array<{ title: string; detail: string }>;
  dualPricingPitch: string;
  interchangePlusPitch: string;
  closing: string;
}

export function generateTalkingPoints(analysis: AnalysisResult): TalkingPoints {
  const { summary, costAnalysis, savings, redFlags } = analysis;
  
  const topSavings = Math.max(
    savings.interchangePlus.annualSavings,
    savings.dualPricing.annualSavings
  );
  
  const monthlySavings = Math.max(
    savings.interchangePlus.monthlySavings,
    savings.dualPricing.monthlySavings
  );

  const opening = `"I've analyzed your processing statement, and I found some significant savings opportunities.

Right now, you're paying an effective rate of ${summary.currentEffectiveRate}% - that's $${summary.currentTotalFees.toLocaleString()} per month in processing fees.

Based on your volume and card mix, your TRUE interchange cost is only ${costAnalysis.trueWholesaleRate}%. 
That means you're paying ${costAnalysis.processorMarkupRate}% in markup to your current processor.

I can show you how to save $${monthlySavings.toLocaleString()} per month - that's $${topSavings.toLocaleString()} per year."`;

  const keyFacts = [
    `Your monthly volume: $${summary.monthlyVolume.toLocaleString()}`,
    `Average ticket: $${summary.averageTicket.toFixed(2)}`,
    `Current effective rate: ${summary.currentEffectiveRate}%`,
    `True interchange cost: ${costAnalysis.trueWholesaleRate}%`,
    `Processor markup: ${costAnalysis.processorMarkupRate}% ($${costAnalysis.processorMarkup.toLocaleString()}/mo)`,
    `You're overpaying by: $${costAnalysis.processorMarkup.toLocaleString()}/month`,
    `Annual savings available: $${topSavings.toLocaleString()}`
  ];

  const redFlagScripts = redFlags.map(flag => ({
    issue: flag.issue,
    script: `"I noticed ${flag.detail.toLowerCase()}. This alone is costing you an extra $${flag.savings.toLocaleString()} that you could be saving."`,
    severity: flag.severity,
    impact: `$${flag.savings.toLocaleString()}/mo`
  }));

  const questions = [
    "When did you last have your rates reviewed by your current processor?",
    "Are you aware that interchange rates are set by Visa and Mastercard, not your processor?",
    "Has your processor ever explained the difference between interchange and their markup?",
    `How would you use an extra $${monthlySavings.toFixed(0)} per month in your business?`,
    "Have you heard about dual pricing, where your customers cover the card processing fee?",
    "What would you do with an extra $" + topSavings.toFixed(0) + " this year?",
    "Do you know what you're paying in hidden fees like PCI compliance or statement fees?"
  ];

  const objections: Record<string, { objection: string; response: string }> = {
    "contract": {
      objection: "I'm locked into a contract",
      response: `"I understand. Here's what I suggest - let's look at your termination clause together. 
Often the savings we provide pay off any termination fee within 2-3 months.
With $${topSavings.toFixed(0)} in annual savings, even a $500 termination fee is worthwhile.
Plus, PCBancard may help cover that fee to earn your business."`
    },

    "happy": {
      objection: "I'm happy with my current processor",
      response: `"I'm glad they've been reliable for you. But being happy doesn't mean you're getting the best deal.
You're currently paying $${costAnalysis.processorMarkup.toFixed(0)} per month MORE than necessary.
That's real money leaving your business - $${topSavings.toFixed(0)} per year.
Wouldn't you rather keep that money working for you?"`
    },

    "noTime": {
      objection: "I don't have time to switch",
      response: `"I completely understand you're busy. That's why we handle everything.
The actual switch takes about 15 minutes of your time.
We do the paperwork, we set up your terminal, we train your staff.
For 15 minutes, you'll save $${topSavings.toFixed(0)} this year. That's a pretty good hourly rate!"`
    },

    "thinkAboutIt": {
      objection: "I need to think about it",
      response: `"Of course, this is an important decision. But while you're thinking, consider this:
Every month you wait costs you $${monthlySavings.toFixed(0)} in unnecessary fees.
By this time next month, that's money you won't get back.
What specific questions can I answer right now to help you decide?"`
    },

    "ratesWillIncrease": {
      objection: "Your rates will probably go up later",
      response: `"I understand that concern - a lot of processors do that. Here's how we're different:
PCBancard uses interchange-plus pricing, which means you always pay TRUE interchange plus our small markup.
Interchange is set by Visa and Mastercard, not us. Our markup is locked in your agreement.
The only way your rate changes is if the card brands change interchange - and that happens to everyone equally."`
    },

    "loyalty": {
      objection: "I've been with them for years",
      response: `"Loyalty is admirable, but is it being rewarded? 
After all these years, they're still charging you ${costAnalysis.processorMarkupRate}% above cost.
Long-term customers should get BETTER rates, not worse.
Let me show you what loyalty looks like with PCBancard - transparent pricing from day one."`
    },

    "talkToProcessor": {
      objection: "Let me talk to my current processor first",
      response: `"That's fair. When you call them, ask specifically:
'What is my all-in effective rate?' and 'What is your markup above interchange?'
If they can't give you clear answers, that tells you something.
I'll leave you my analysis so you can compare. Call me after you talk to them."`
    },

    "tooGoodToBeTrue": {
      objection: "This sounds too good to be true",
      response: `"I appreciate your skepticism - you SHOULD ask tough questions about something this important.
Let me explain exactly where these savings come from. It's not magic:
First, your current processor is charging you ${costAnalysis.processorMarkupRate}% above interchange. We charge just 0.20%.
Second, with dual pricing, the customer pays a small service fee for using their card.
I'm not promising anything I can't deliver. These numbers are based on YOUR actual statement."`
    }
  };

  const valueProps: Array<{ title: string; detail: string }> = [
    {
      title: "Transparent Interchange-Plus Pricing",
      detail: "See exactly what interchange you pay - no hidden markups or bundled rates"
    },
    {
      title: "No Junk Fees",
      detail: "No annual fees, no PCI non-compliance fees, no statement fees, no batch fees"
    },
    {
      title: "Free PCI Compliance Assistance",
      detail: "We help you complete your PCI questionnaire at no additional cost"
    },
    {
      title: "Free Terminal with Dual Pricing",
      detail: "Dejavoo P1 or P3 terminal included with our free equipment program"
    },
    {
      title: "No Long-Term Contract",
      detail: "Month-to-month agreement with no early termination fees"
    },
    {
      title: "US-Based Support",
      detail: "Real people answering the phone, not overseas call centers"
    },
    {
      title: "Next-Day Funding Available",
      detail: "Get your money faster with next-day deposit options"
    },
    {
      title: "Dual Pricing Program",
      detail: "Pass processing costs to card users, keep your cash price competitive"
    }
  ];

  const dualPricingPitch = `"Let me tell you about our Dual Pricing program - this is a game-changer for businesses like yours.

With dual pricing, you display TWO prices: a cash price and a card price.
The card price includes a small service fee - typically 3.99%.
When customers pay with a card, THEY cover the processing fee, not you.

Your effective rate drops to nearly ZERO. Instead of paying $${summary.currentTotalFees.toLocaleString()}/month, 
you'd pay just $20/month in account fees.

That's $${savings.dualPricing.monthlySavings.toLocaleString()} per month back in YOUR pocket.
$${savings.dualPricing.annualSavings.toLocaleString()} per year.

And it's 100% legal and compliant when done correctly - we handle all the signage and disclosures.

About 85% of our new merchants choose dual pricing once they understand it. Would you like me to show you exactly how it would look in your business?"`;

  const interchangePlusPitch = `"If dual pricing isn't the right fit for your business, we also offer Interchange-Plus pricing - and it's still significantly better than what you're paying now.

With Interchange-Plus, you pay the TRUE wholesale interchange cost - exactly what Visa and Mastercard charge - plus a small, transparent markup of just 0.20% and $0.10 per transaction.

Your true interchange cost is ${costAnalysis.trueWholesaleRate}%. Add our markup, and your all-in effective rate would be around ${(costAnalysis.trueWholesaleRate + 0.25).toFixed(2)}%.

That's a savings of $${savings.interchangePlus.monthlySavings.toLocaleString()} per month compared to what you're paying now.
$${savings.interchangePlus.annualSavings.toLocaleString()} per year.

No hidden fees, no junk fees, no surprises. Just honest, transparent pricing.

The best part? You'll get a detailed statement every month showing exactly what you paid in interchange versus our markup. Complete transparency."`;

  const recommendedProgram = savings.dualPricing.annualSavings > savings.interchangePlus.annualSavings 
    ? 'dual pricing' 
    : 'interchange-plus';
  
  const recommendedSavings = Math.max(savings.dualPricing.annualSavings, savings.interchangePlus.annualSavings);

  const closing = `"Based on everything we've discussed, here's the bottom line:

Switch to PCBancard and you'll save $${topSavings.toFixed(0)} this year.
${savings.dualPricing.annualSavings > savings.interchangePlus.annualSavings 
  ? `With our dual pricing program, you could save up to $${savings.dualPricing.annualSavings.toLocaleString()} annually.` 
  : `With interchange-plus pricing, you'll save $${savings.interchangePlus.annualSavings.toLocaleString()} annually with complete transparency.`}

I can have you set up and processing within 48 hours.
You keep your same bank account, same business operations - just lower fees.

What questions do you have before we get you started?"`;

  return {
    opening,
    keyFacts,
    redFlagScripts,
    questions,
    objections,
    valueProps,
    dualPricingPitch,
    interchangePlusPitch,
    closing
  };
}

export function generateCompetitorInsights(processorName: string): { 
  knownIssues: string[]; 
  contractPitfalls: string[]; 
  talkingPoints: string[] 
} {
  const processorLower = processorName.toLowerCase();
  
  const insights: Record<string, { knownIssues: string[]; contractPitfalls: string[]; talkingPoints: string[] }> = {
    'square': {
      knownIssues: [
        'Flat rate pricing (2.6% + 10¢) is expensive for card-present retail',
        'Limited customer support - mostly online/chat only',
        'Account holds and freezes without warning',
        'No interchange-plus option available'
      ],
      contractPitfalls: [
        'Rolling reserve may be held without notice',
        'Account termination at Square\'s discretion',
        'Chargeback fees are high ($15-20)'
      ],
      talkingPoints: [
        '"Square\'s flat rate seems simple, but you\'re paying premium prices for standard transactions"',
        '"Have you ever had funds held? That\'s a common complaint with Square"',
        '"With your volume, interchange-plus would save you significantly over Square\'s flat rate"'
      ]
    },
    'stripe': {
      knownIssues: [
        'Designed for e-commerce, not optimal for in-person',
        '2.9% + 30¢ is high for card-present transactions',
        'Technical support requires development knowledge',
        'Limited in-person payment options'
      ],
      contractPitfalls: [
        'Payout delays for new accounts',
        'High dispute fees',
        'Volume thresholds may trigger additional requirements'
      ],
      talkingPoints: [
        '"Stripe is great for developers, but you\'re paying a premium for features you don\'t need"',
        '"Their per-transaction fee of 30¢ really adds up with your ticket size"'
      ]
    },
    'clover': {
      knownIssues: [
        'Equipment leases are long-term and expensive',
        'Bundled pricing often hides true costs',
        'Limited portability - equipment tied to processor',
        'High termination fees'
      ],
      contractPitfalls: [
        '3-4 year equipment leases are common',
        'Early termination fees can be $500+',
        'Equipment becomes useless if you switch'
      ],
      talkingPoints: [
        '"Are you leasing your Clover? Let\'s calculate what you\'re really paying over 3 years"',
        '"PCBancard offers free terminals that you own - no lease payments"'
      ]
    },
    'heartland': {
      knownIssues: [
        'Sales tactics can be aggressive',
        'Pricing can be opaque despite "transparent" marketing',
        'Equipment fees often bundled in'
      ],
      contractPitfalls: [
        'Long-term contracts are common',
        'Auto-renewal clauses',
        'Termination fees may apply'
      ],
      talkingPoints: [
        '"Let\'s compare your Heartland statement to true interchange - I bet we find some margin"'
      ]
    },
    'worldpay': {
      knownIssues: [
        'Complex pricing structures',
        'Multiple fee categories can be confusing',
        'Large company, can be slow to resolve issues'
      ],
      contractPitfalls: [
        'Multi-year contracts common',
        'PCI fees often included',
        'Equipment terms may be long'
      ],
      talkingPoints: [
        '"Big processors like Worldpay have a lot of overhead - that gets passed to you"'
      ]
    },
    'first data': {
      knownIssues: [
        'Now part of Fiserv - even bigger',
        'Tiered pricing is common and expensive',
        'Non-qualified surcharges can be high'
      ],
      contractPitfalls: [
        'Long contracts with auto-renewal',
        'Multiple fee categories',
        'Early termination fees'
      ],
      talkingPoints: [
        '"First Data loves tiered pricing - let\'s see how much you\'re paying in non-qualified fees"'
      ]
    },
    'fiserv': {
      knownIssues: [
        'Largest processor = lots of overhead',
        'Tiered pricing structures',
        'Complex statements'
      ],
      contractPitfalls: [
        'Multi-year commitments',
        'Auto-renewal clauses',
        'Termination fees'
      ],
      talkingPoints: [
        '"Big banks and processors add layers of fees - let me show you what you\'re really paying"'
      ]
    }
  };

  for (const [key, value] of Object.entries(insights)) {
    if (processorLower.includes(key)) {
      return value;
    }
  }

  return {
    knownIssues: [
      'Many processors use tiered or bundled pricing that hides true costs',
      'Long-term contracts with auto-renewal are common',
      'PCI fees and other monthly charges add up'
    ],
    contractPitfalls: [
      'Review termination clause before switching',
      'Check for equipment lease terms',
      'Look for auto-renewal language'
    ],
    talkingPoints: [
      '"Let\'s compare your actual costs to true interchange - processors love to add hidden margin"'
    ]
  };
}
