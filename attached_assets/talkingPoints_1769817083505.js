// Talking Points Generator
// Creates negotiation scripts based on statement analysis

import { formatCurrency, formatCurrencyExact, formatPercent } from './analysisEngine.js';

/**
 * Generate all talking points from analysis results
 */
export function generateTalkingPoints(analysis) {
  if (!analysis || !analysis.success) {
    return null;
  }

  const { input, current, trueCosts, markup, pcbancard, summary } = analysis;
  
  const monthlySavings = summary.maxMonthlySavings;
  const annualSavings = summary.maxAnnualSavings;
  const bestOption = pcbancard.recommended;

  return {
    opening: generateOpening(input, current, trueCosts, markup, monthlySavings, annualSavings),
    keyFacts: generateKeyFacts(input, current, trueCosts, markup, monthlySavings, annualSavings),
    questions: generateQuestions(monthlySavings),
    objections: generateObjectionHandlers(monthlySavings, annualSavings, analysis),
    valueProps: generateValueProps(),
    dualPricingPitch: generateDualPricingPitch(current, pcbancard),
    icPlusPitch: generateICPlusPitch(trueCosts, pcbancard),
    closing: generateClosing(annualSavings, bestOption, current, pcbancard),
    stats: {
      currentRate: formatPercent(current.effectiveRate),
      trueWholesale: formatPercent(trueCosts.wholesaleRate),
      markup: formatPercent(markup.rate),
      monthlySavings: formatCurrency(monthlySavings),
      annualSavings: formatCurrency(annualSavings),
      recommendedProgram: bestOption === 'dualPricing' ? 'Dual Pricing' : 'Interchange Plus'
    }
  };
}

function generateOpening(input, current, trueCosts, markup, monthlySavings, annualSavings) {
  return `"I've completed a detailed analysis of your processing statement, and I found some significant opportunities for you.

You're currently paying an effective rate of ${formatPercent(current.effectiveRate)} on your ${formatCurrency(input.volume)} in monthly volume. That comes out to ${formatCurrencyExact(current.totalFees)} per month in processing fees.

Here's what most processors don't tell you: the TRUE cost of processing your transactions - what's called interchange - is only ${formatPercent(trueCosts.wholesaleRate)}. 

That means your current processor is charging you ${formatPercent(markup.rate)} in markup above the actual cost. That's ${formatCurrency(markup.amount)} every month that's going straight to their profit - not yours.

I can show you how to save ${formatCurrency(monthlySavings)} per month. That's ${formatCurrency(annualSavings)} per year that stays in YOUR business."`;
}

function generateKeyFacts(input, current, trueCosts, markup, monthlySavings, annualSavings) {
  return [
    `Monthly processing volume: ${formatCurrency(input.volume)}`,
    `Monthly transactions: ${input.transactions.toLocaleString()}`,
    `Average ticket: ${formatCurrencyExact(input.averageTicket)}`,
    `Current effective rate: ${formatPercent(current.effectiveRate)}`,
    `True interchange cost: ${formatPercent(trueCosts.wholesaleRate)}`,
    `Processor markup: ${formatPercent(markup.rate)} (${formatCurrency(markup.amount)}/month)`,
    `Potential monthly savings: ${formatCurrency(monthlySavings)}`,
    `Potential annual savings: ${formatCurrency(annualSavings)}`
  ];
}

function generateQuestions(monthlySavings) {
  return [
    "When was the last time your processor reviewed your rates with you?",
    "Are you aware that interchange rates are set by Visa and Mastercard, not your processor?",
    "Has anyone ever shown you exactly what interchange you're paying versus processor markup?",
    `If I could show you how to keep an extra ${formatCurrency(monthlySavings)} per month, would that be worth 15 minutes of your time?`,
    "Have you heard about dual pricing? It's completely changed the game for businesses like yours.",
    `What would you do with an extra ${formatCurrency(monthlySavings * 12)} per year in your business?`,
    "How long have you been with your current processor?",
    "Are you locked into a contract? Do you know the terms?"
  ];
}

function generateObjectionHandlers(monthlySavings, annualSavings, analysis) {
  return {
    contract: {
      objection: "I'm locked into a contract",
      response: `"I understand contracts can feel like a barrier. But let me ask you this - do you know exactly what your early termination clause says?

Most merchants don't realize that the savings we provide often pay off any termination fee within just 2-3 months. With ${formatCurrency(annualSavings)} in annual savings, even a $500 termination fee pays for itself quickly.

Plus, many contracts have loopholes - rate increases, fee changes - that may have already voided the terms. Would you mind if I took a look at it?

And here's something else: PCBancard may help cover that termination fee to earn your business. Would that help?"`
    },
    
    happy: {
      objection: "I'm happy with my current processor",
      response: `"I'm glad they've been reliable for you - that's important. But here's the thing: being happy doesn't necessarily mean you're getting the best deal.

Based on what I'm seeing here, you're paying ${formatCurrency(monthlySavings)} more than necessary every single month. That's real money - ${formatCurrency(annualSavings)} per year - leaving your business.

I'm not asking you to fix something that's broken. I'm showing you how to keep more of what you earn. Even if everything else stays exactly the same, wouldn't you rather have that ${formatCurrency(annualSavings)} in YOUR account instead of theirs?"`
    },
    
    noTime: {
      objection: "I don't have time to switch",
      response: `"I completely understand - you're busy running your business, not worrying about payment processing. That's exactly why we handle everything.

The actual switch takes about 15 minutes of your time. We do all the paperwork, we program your terminal, we train your staff if needed. You don't have to do anything except keep running your business.

For 15 minutes, you'll save ${formatCurrency(annualSavings)} this year. That's like getting paid ${formatCurrency(annualSavings / 0.25)} per hour for your time. Not a bad deal, right?"`
    },
    
    thinkAboutIt: {
      objection: "I need to think about it",
      response: `"Absolutely, this is an important decision for your business. But while you're thinking, I want you to consider something:

Every month you wait costs you ${formatCurrency(monthlySavings)} in fees that you could have saved. By this time next month, that's money you won't get back.

I'm not trying to pressure you - I just want to make sure you have all the information. What specific questions do you have that I can answer right now to help you make this decision?

Is there something about the numbers that doesn't make sense, or is there something else holding you back?"`
    },
    
    ratesWillIncrease: {
      objection: "Your rates will probably go up later",
      response: `"That's a smart concern - a lot of processors do exactly that. It's called 'rate creep' and it's how they get you.

Here's how PCBancard is different: We use interchange-plus pricing, which means you ALWAYS pay the true interchange cost plus our small fixed markup.

Interchange is set by Visa and Mastercard, not by us. Our markup is locked in your agreement and doesn't change. The only way your cost changes is if the card brands change interchange rates - and that happens to everyone equally, including your current processor.

Plus, with our dual pricing program, your effective rate is nearly zero regardless of interchange changes. The customer covers the fee, not you."`
    },
    
    tooGoodToBeTrue: {
      objection: "This sounds too good to be true",
      response: `"I appreciate your skepticism - you SHOULD ask tough questions about something this important.

Let me explain exactly where these savings come from. It's not magic:

First, your current processor is charging you ${formatPercent(analysis.markup.rate)} above interchange. We charge 0.20%. That's real, verifiable math.

Second, with dual pricing, the customer pays a small service fee for using their card. It's the same concept as a gas station charging more for credit than cash - completely legal and becoming very common.

I'm not promising anything I can't deliver. These numbers are based on YOUR actual statement. Would you like me to walk through the math step by step?"`
    }
  };
}

function generateValueProps() {
  return [
    { title: "Transparent Interchange-Plus Pricing", detail: "See exactly what interchange you pay - no hidden markups" },
    { title: "No Junk Fees", detail: "No annual fees, no PCI non-compliance fees, no statement fees" },
    { title: "Free PCI Compliance Assistance", detail: "We help you complete your PCI questionnaire at no extra cost" },
    { title: "Free Terminal with Dual Pricing", detail: "Dejavoo P1 or P3 terminal included" },
    { title: "No Long-Term Contract", detail: "Month-to-month agreement with no early termination fees" },
    { title: "US-Based Support", detail: "Real people answering the phone" },
    { title: "Next-Day Funding Available", detail: "Get your money faster" },
    { title: "Dual Pricing Program", detail: "Pass processing costs to card users" }
  ];
}

function generateDualPricingPitch(current, pcbancard) {
  return `"Let me tell you about our Dual Pricing program - this is a game-changer for businesses like yours.

Here's how it works: You display TWO prices for everything - a cash price and a card price. The card price includes a small service fee, typically ${pcbancard.dualPricing.serviceFee}%.

When customers pay with cash or debit, they pay the lower price.
When they pay with a credit card, they pay the slightly higher price that covers the processing fee.

The result? Instead of YOU paying ${formatCurrencyExact(current.totalFees)} per month in processing fees, your customers cover that cost when they choose to use a card.

Your effective processing cost drops to nearly ZERO - just ${formatCurrencyExact(pcbancard.dualPricing.total)} per month in basic account fees.

That's ${formatCurrency(pcbancard.dualPricing.savings)} per month back in YOUR pocket.
${formatCurrency(pcbancard.dualPricing.annualSavings)} per year.

And it's 100% legal and compliant when done correctly. We provide all the signage, we set up your terminal, we make sure everything is done right.

About 85% of our new merchants choose dual pricing once they understand it. Would you like me to show you exactly how it would look in your business?"`;
}

function generateICPlusPitch(trueCosts, pcbancard) {
  return `"If dual pricing isn't the right fit for your business, we also offer traditional Interchange-Plus pricing - and it's still significantly better than what you're paying now.

With Interchange-Plus, you pay the true wholesale interchange cost - exactly what Visa and Mastercard charge - plus a small, transparent markup of just 0.20% and $0.10 per transaction.

Your true interchange cost is ${formatPercent(trueCosts.wholesaleRate)}. Add our markup, and your all-in effective rate would be around ${formatPercent(trueCosts.wholesaleRate + 0.25)}.

That's a savings of ${formatCurrency(pcbancard.interchangePlus.savings)} per month compared to what you're paying now.

The biggest difference you'll notice is transparency. Every month, your statement will show exactly what interchange you paid and exactly what our markup was. No surprises, no hidden fees, no bundled rates that obscure what you're really paying.

Would you prefer this straightforward approach?"`;
}

function generateClosing(annualSavings, recommendedProgram, current, pcbancard) {
  const programName = recommendedProgram === 'dualPricing' ? 'Dual Pricing' : 'Interchange Plus';
  
  return `"Based on everything we've discussed, here's the bottom line:

Switching to PCBancard will save you ${formatCurrency(annualSavings)} this year.

${recommendedProgram === 'dualPricing' 
  ? `With our Dual Pricing program, you'll pay just ${formatCurrencyExact(pcbancard.dualPricing.total)} per month instead of ${formatCurrencyExact(current.totalFees)}. Your customers cover the card processing fee, and you keep your prices competitive.`
  : `With our Interchange Plus pricing, you'll pay true interchange plus just 0.20% - far less than the markup you're paying now.`
}

I can have you set up and processing within 48 hours. You keep your same bank account, same business operations - just lower fees and more money staying in your business.

What questions do you have before we get started?"`;
}
