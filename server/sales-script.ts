// SignaPay PayLo Sales Script - Used for AI-powered email generation
// This script provides context about the SignaPay PayLo dual pricing program
// for crafting personalized follow-up emails to merchants

export const SIGNAPAY_SALES_SCRIPT = `
## SignaPay PayLo Overview

SignaPay PayLo is a dual pricing program that helps business owners stop losing 3-4% of every card transaction to processing fees.

### The Problem
- Every card transaction (dip, tap, swipe) takes 3-4% off the top
- On a $40 ticket, that's $1.20-$1.60 gone every time
- This can add up to $10,000-$25,000 per year for busy businesses
- Most owners don't know how much they're losing until someone shows them

### Three Solutions
1. **Interchange-Plus**: Pay true cost + small fixed fee. Transparent pricing.
2. **Surcharging**: Add fee to credit cards (but can't surcharge debit - federal law)
3. **Dual Pricing (PayLo)**: Show cash price and card price. Customer chooses. Works on credit AND debit.

### PayLo Benefits
- Fully automated - system does the math
- Customers see both prices and choose how to pay
- Clear signage keeps you compliant
- Plug the leak on BOTH credit and debit transactions
- 90-Day Protection Promise - adjust or switch to Interchange-Plus at no cost

### Customer Reaction
- Most customers say nothing - they've seen dual pricing at gas stations
- They choose cash or card and move on
- Simple answer if asked: "It's posted upfront, and it keeps our prices competitive"
- Real-world pushback is closer to 1 in 100, not 1 in 20

### The Profit Flywheel
Savings can be reinvested into:
- Marketing (Facebook/Google ads, 5-mile radius campaigns)
- Loyalty programs (points, repeat visit incentives)
- Staff training and certifications
- Better equipment and technology

### Business Type Examples
- **Auto shops**: Use savings for diagnostic tools, technician training
- **Restaurants**: Invest in kitchen equipment, loyalty programs
- **Salons**: Staff training, product inventory, marketing
- **Retail**: Better inventory, customer loyalty programs
- **Service businesses**: Equipment upgrades, marketing campaigns
- **Medical offices**: Office improvements, staff training
- **Convenience stores**: Already familiar with dual pricing from gas stations

### Key Talking Points
- "You've done the hard part - building something people come back to"
- "The goal isn't to work harder, it's to keep what you earned"
- "When your rep comes back, we'll walk through your numbers - takes about 10 minutes"
- "Bring a recent statement if you have one - if not, just knowing your monthly card volume is enough"
- "The leak doesn't pause while you decide"

### Next Steps
1. Review recent processing statement with rep
2. See line-by-line breakdown of fees
3. Quick digital application (24-48 hour approval)
4. Most businesses are live within a day or two
5. Savings are measurable from day one
`;

export const BUSINESS_TYPE_CONTEXT: Record<string, string> = {
  restaurant: `
This is a restaurant/food service business. Focus on:
- High transaction volume means significant fee savings
- Loyalty programs to increase repeat visits
- Kitchen equipment upgrades
- Staff training and retention
- Tight margins make every percentage point matter
`,
  retail: `
This is a retail business. Focus on:
- Competitive pricing in the market
- Inventory investment opportunities
- Customer loyalty programs
- Point of sale experience
- Seasonal cash flow management
`,
  service: `
This is a service-based business. Focus on:
- Professional image and trust
- Equipment and tool upgrades
- Staff training and certifications
- Marketing to attract new clients
- Repeat business and referrals
`,
  salon: `
This is a salon/beauty business. Focus on:
- High-touch customer relationships
- Product inventory investment
- Staff training and continuing education
- Loyalty programs for regular clients
- Tips and how dual pricing works with them
`,
  auto: `
This is an auto/repair shop. Focus on:
- Diagnostic equipment upgrades
- Technician training and certifications
- Parts inventory management
- Customer trust and transparency
- Seasonal service opportunities
`,
  medical: `
This is a medical/healthcare office. Focus on:
- Patient experience improvements
- Office equipment and technology
- Staff training and compliance
- Professional atmosphere
- Insurance vs direct payment considerations
`,
  convenience: `
This is a convenience store. Focus on:
- Already familiar with dual pricing from gas stations
- High transaction volume with small tickets
- Competitive pricing in the neighborhood
- Quick customer turnover
- Impulse purchase margins
`,
  other: `
This is a general business. Focus on:
- Understanding their specific payment patterns
- How dual pricing fits their customer base
- Reinvestment opportunities specific to their industry
- Building a relationship for long-term partnership
`,
};

export function getEmailPrompt(
  businessName: string,
  contactName: string,
  businessType: string,
  agentNotes: string,
  purpose: string,
  tone: string
): string {
  const businessContext = BUSINESS_TYPE_CONTEXT[businessType] || BUSINESS_TYPE_CONTEXT.other;
  
  return `You are a professional sales email writer for SignaPay, a payment processing company. 
Your job is to write a personalized follow-up email to a merchant based on the agent's visit notes.

${SIGNAPAY_SALES_SCRIPT}

## Business Context
${businessContext}

## Email Details
- Business Name: ${businessName}
- Contact Name: ${contactName || "the business owner"}
- Business Type: ${businessType}
- Email Purpose: ${purpose}
- Desired Tone: ${tone}

## Agent's Notes from Visit
${agentNotes || "No specific notes provided"}

## Instructions
1. Write a personalized email that references the specific business and any details from the agent's notes
2. For ${businessType} businesses, use relevant talking points from the business context
3. Keep the email concise but warm - aim for 3-4 short paragraphs
4. End with a clear call to action (schedule a follow-up, review statement, etc.)
5. Use the ${tone} tone throughout
6. Do NOT include subject line - just the email body
7. Sign off with "[Your Name]" placeholder
8. Reference specific details from the agent's notes when possible
9. If notes mention specific pain points (like tip handling, equipment needs, etc.), address those directly
`;
}
