# REPLIT: Complete Proposal Generator Fix

## Current Problems (From Testing Bob's Brake Muffler & Auto Repair)

| Issue | What's Broken |
|-------|---------------|
| Wrong Industry | "restaurant" detected for auto repair shop |
| Address Mangled | Phone number crammed into address field |
| Placeholder Visible | `{meta description}` showing in output |
| No Logo | Website logo not captured |
| No Contact Fields | Can't enter owner name, title, phone, email |
| Generic Images | "24" placeholder instead of custom image |

---

## SOLUTION 1: Add Merchant Contact Section

### Frontend Component (ProposalGenerator.tsx)

Add this collapsible section after Salesperson Info:

```tsx
import { useState } from 'react';
import { Building2, ChevronDown, User, Phone, Mail, MapPin } from 'lucide-react';

// Add to your state
const [merchantExpanded, setMerchantExpanded] = useState(false);
const [merchantContact, setMerchantContact] = useState({
  businessName: '',      // Override scraped name
  industry: '',          // Override scraped industry
  ownerFirstName: '',
  ownerLastName: '',
  ownerTitle: '',
  phone: '',
  email: '',
  streetAddress: '',
  city: '',
  state: '',
  zip: '',
});

// The JSX component
<div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-6">
  {/* Header - Click to expand */}
  <button
    type="button"
    onClick={() => setMerchantExpanded(!merchantExpanded)}
    className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
  >
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
        <Building2 className="w-5 h-5 text-purple-600" />
      </div>
      <div className="text-left">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          Merchant Contact Info
          <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
            Optional
          </span>
        </h3>
        <p className="text-sm text-gray-500">
          Override auto-detected info or add owner details
        </p>
      </div>
    </div>
    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${merchantExpanded ? 'rotate-180' : ''}`} />
  </button>

  {/* Expandable Content */}
  {merchantExpanded && (
    <div className="px-6 pb-6 space-y-5 border-t bg-gray-50/50">
      <div className="pt-5">
        {/* Business Override Section */}
        <div className="mb-5 pb-5 border-b">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Business Details (Override Scraped Data)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Business Name</label>
              <input
                type="text"
                value={merchantContact.businessName}
                onChange={(e) => setMerchantContact({...merchantContact, businessName: e.target.value})}
                placeholder="Leave blank to use detected name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Industry</label>
              <select
                value={merchantContact.industry}
                onChange={(e) => setMerchantContact({...merchantContact, industry: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Auto-detect from website</option>
                <option value="auto_repair">🔧 Auto Repair / Automotive</option>
                <option value="restaurant">🍽️ Restaurant / Food Service</option>
                <option value="retail">🛍️ Retail</option>
                <option value="healthcare">🏥 Healthcare / Medical</option>
                <option value="professional">💼 Professional Services</option>
                <option value="construction">🏗️ Construction / Trades</option>
                <option value="salon">💇 Salon / Spa / Beauty</option>
                <option value="fitness">💪 Fitness / Gym</option>
                <option value="lodging">🏨 Hotel / Lodging</option>
                <option value="other">🏢 Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Owner/Contact Section */}
        <div className="mb-5 pb-5 border-b">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Owner / Decision Maker</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">First Name</label>
              <input
                type="text"
                value={merchantContact.ownerFirstName}
                onChange={(e) => setMerchantContact({...merchantContact, ownerFirstName: e.target.value})}
                placeholder="Bob"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Last Name</label>
              <input
                type="text"
                value={merchantContact.ownerLastName}
                onChange={(e) => setMerchantContact({...merchantContact, ownerLastName: e.target.value})}
                placeholder="Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Title</label>
              <input
                type="text"
                value={merchantContact.ownerTitle}
                onChange={(e) => setMerchantContact({...merchantContact, ownerTitle: e.target.value})}
                placeholder="Owner"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Contact Info Section */}
        <div className="mb-5 pb-5 border-b">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Contact Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                <Phone className="w-3 h-3 inline mr-1" />
                Phone
              </label>
              <input
                type="tel"
                value={merchantContact.phone}
                onChange={(e) => setMerchantContact({...merchantContact, phone: e.target.value})}
                placeholder="(215) 710-0456"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                <Mail className="w-3 h-3 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                value={merchantContact.email}
                onChange={(e) => setMerchantContact({...merchantContact, email: e.target.value})}
                placeholder="bob@business.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            <MapPin className="w-3 h-3 inline mr-1" />
            Address
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Street Address</label>
              <input
                type="text"
                value={merchantContact.streetAddress}
                onChange={(e) => setMerchantContact({...merchantContact, streetAddress: e.target.value})}
                placeholder="450 W Street Rd"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-1">City</label>
                <input
                  type="text"
                  value={merchantContact.city}
                  onChange={(e) => setMerchantContact({...merchantContact, city: e.target.value})}
                  placeholder="Warminster"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm text-gray-600 mb-1">State</label>
                <input
                  type="text"
                  value={merchantContact.state}
                  onChange={(e) => setMerchantContact({...merchantContact, state: e.target.value.toUpperCase()})}
                  placeholder="PA"
                  maxLength={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-1">ZIP Code</label>
                <input
                  type="text"
                  value={merchantContact.zip}
                  onChange={(e) => setMerchantContact({...merchantContact, zip: e.target.value})}
                  placeholder="18974"
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}
</div>
```

---

## SOLUTION 2: Fix Industry Detection

The scraper is guessing wrong. Add this helper function:

```typescript
// utils/industryDetection.ts

export function detectIndustryFromName(businessName: string): string {
  const name = businessName.toLowerCase();
  
  // Auto/Automotive keywords
  if (
    name.includes('auto') ||
    name.includes('car') ||
    name.includes('brake') ||
    name.includes('muffler') ||
    name.includes('tire') ||
    name.includes('mechanic') ||
    name.includes('transmission') ||
    name.includes('collision') ||
    name.includes('body shop') ||
    name.includes('lube') ||
    name.includes('oil change') ||
    name.includes('repair') && (name.includes('auto') || name.includes('car'))
  ) {
    return 'auto_repair';
  }
  
  // Restaurant keywords
  if (
    name.includes('restaurant') ||
    name.includes('cafe') ||
    name.includes('diner') ||
    name.includes('bistro') ||
    name.includes('grill') ||
    name.includes('pizza') ||
    name.includes('burger') ||
    name.includes('taco') ||
    name.includes('sushi') ||
    name.includes('kitchen') ||
    name.includes('eatery') ||
    name.includes('bbq') ||
    name.includes('steakhouse')
  ) {
    return 'restaurant';
  }
  
  // Salon/Spa keywords
  if (
    name.includes('salon') ||
    name.includes('spa') ||
    name.includes('hair') ||
    name.includes('nail') ||
    name.includes('beauty') ||
    name.includes('barber') ||
    name.includes('cuts') ||
    name.includes('style') && name.includes('hair')
  ) {
    return 'salon';
  }
  
  // Healthcare keywords
  if (
    name.includes('medical') ||
    name.includes('clinic') ||
    name.includes('dental') ||
    name.includes('doctor') ||
    name.includes('chiro') ||
    name.includes('health') ||
    name.includes('therapy') ||
    name.includes('care') && (name.includes('health') || name.includes('medical'))
  ) {
    return 'healthcare';
  }
  
  // Construction keywords
  if (
    name.includes('construction') ||
    name.includes('plumbing') ||
    name.includes('electric') ||
    name.includes('hvac') ||
    name.includes('roofing') ||
    name.includes('contractor') ||
    name.includes('landscap') ||
    name.includes('building')
  ) {
    return 'construction';
  }
  
  // Retail keywords
  if (
    name.includes('store') ||
    name.includes('shop') ||
    name.includes('mart') ||
    name.includes('boutique') ||
    name.includes('outlet')
  ) {
    return 'retail';
  }
  
  return 'other';
}

// Use BEFORE the AI analysis
const industryFromName = detectIndustryFromName(businessName);
if (industryFromName !== 'other') {
  // Trust the business name detection
  businessInfo.industry = industryFromName;
}
```

---

## SOLUTION 3: Fix Scraping to Use Claude Better

```typescript
// server/routes/scrape.ts

import Anthropic from '@anthropic-ai/sdk';

app.post('/api/scrape-website', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Fetch HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract logo with multiple methods
    const logoUrl = await extractLogo(html, url);
    
    // Use Claude to analyze the page
    const anthropic = new Anthropic();
    
    // Clean HTML for analysis
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000);

    const analysisResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Extract business information from this website content.

URL: ${url}
Content: ${textContent}

CRITICAL RULES:
1. Look at the ACTUAL business type. "Auto Repair", "Brake", "Muffler", "Mechanic" = auto_repair, NOT restaurant
2. Separate address and phone number into different fields
3. Do not include phone in address field
4. Do not return placeholders like "{meta description}" - use null if not found
5. If you cannot find a field with certainty, use null

Return ONLY this JSON format:
{
  "businessName": "exact name from website",
  "industry": "auto_repair|restaurant|retail|healthcare|salon|construction|fitness|professional|lodging|other",
  "description": "2 sentence description or null",
  "phone": "phone number only or null",
  "address": "street address only or null",
  "city": "city name or null",
  "state": "2-letter state code or null", 
  "zip": "zip code or null",
  "services": ["service1", "service2"] or [],
  "hours": "business hours or null"
}`
      }]
    });

    // Parse Claude's response
    let businessInfo;
    try {
      const text = analysisResponse.content[0].type === 'text' 
        ? analysisResponse.content[0].text 
        : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        businessInfo = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      businessInfo = {
        businessName: null,
        industry: 'other',
        description: null,
        phone: null,
        address: null,
        city: null,
        state: null,
        zip: null,
        services: [],
        hours: null
      };
    }

    // Double-check industry detection from business name
    if (businessInfo.businessName) {
      const nameBasedIndustry = detectIndustryFromName(businessInfo.businessName);
      if (nameBasedIndustry !== 'other') {
        businessInfo.industry = nameBasedIndustry;
      }
    }

    // Clean up any placeholder text
    Object.keys(businessInfo).forEach(key => {
      if (typeof businessInfo[key] === 'string') {
        if (
          businessInfo[key].includes('{') ||
          businessInfo[key].includes('meta') ||
          businessInfo[key] === 'undefined' ||
          businessInfo[key] === 'null'
        ) {
          businessInfo[key] = null;
        }
      }
    });

    res.json({
      success: true,
      data: {
        ...businessInfo,
        logoUrl,
        websiteUrl: url,
        scrapedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ 
      error: 'Failed to scrape website',
      message: error.message 
    });
  }
});

async function extractLogo(html: string, baseUrl: string): Promise<string | null> {
  const urlObj = new URL(baseUrl);
  
  // Pattern 1: og:image meta tag
  const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (ogMatch) return makeAbsolute(ogMatch[1], urlObj);
  
  // Pattern 2: logo in class or id
  const logoImgMatch = html.match(/<img[^>]*(?:class|id)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i);
  if (logoImgMatch) return makeAbsolute(logoImgMatch[1], urlObj);
  
  // Pattern 3: src with "logo" in filename
  const logoSrcMatch = html.match(/<img[^>]*src=["']([^"']*logo[^"']*\.(?:png|jpg|jpeg|svg|webp))["']/i);
  if (logoSrcMatch) return makeAbsolute(logoSrcMatch[1], urlObj);
  
  // Pattern 4: First image in header
  const headerImgMatch = html.match(/<header[^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["']/i);
  if (headerImgMatch) return makeAbsolute(headerImgMatch[1], urlObj);
  
  // Fallback: Clearbit API
  return `https://logo.clearbit.com/${urlObj.hostname}`;
}

function makeAbsolute(url: string, baseUrl: URL): string {
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${baseUrl.origin}${url}`;
  return `${baseUrl.origin}/${url}`;
}
```

---

## SOLUTION 4: Generate Custom Proposal with Claude

```typescript
// server/routes/generate-proposal-content.ts

app.post('/api/generate-proposal-content', async (req, res) => {
  const { merchantInfo, salespersonInfo, savingsData } = req.body;
  
  try {
    const anthropic = new Anthropic();
    
    const industryNames = {
      'auto_repair': 'Auto Repair Shop',
      'restaurant': 'Restaurant',
      'retail': 'Retail Store',
      'healthcare': 'Healthcare Practice',
      'salon': 'Salon/Spa',
      'construction': 'Contractor',
      'fitness': 'Fitness Center',
      'professional': 'Professional Services',
      'lodging': 'Hotel/Lodging',
      'other': 'Business'
    };

    const prompt = `Write a professional, personalized payment processing proposal.

MERCHANT:
- Business: ${merchantInfo.businessName}
- Industry: ${industryNames[merchantInfo.industry] || merchantInfo.industry}
- Owner: ${merchantInfo.ownerFirstName} ${merchantInfo.ownerLastName}
- Location: ${merchantInfo.city}, ${merchantInfo.state}

SAVINGS:
- Dual Pricing Annual Savings: $${savingsData.dualPricingAnnual?.toLocaleString() || '0'}
- Traditional (IC+) Annual Savings: $${savingsData.traditionalAnnual?.toLocaleString() || '0'}
- Current Monthly Fees: $${savingsData.currentMonthlyFees?.toLocaleString() || 'unknown'}

SALESPERSON:
- Name: ${salespersonInfo.firstName} ${salespersonInfo.lastName}
- Title: ${salespersonInfo.title || 'Account Executive'}
- Phone: ${salespersonInfo.phone}
- Email: ${salespersonInfo.email}

Write compelling proposal content tailored to their specific industry. Return as JSON:
{
  "personalizedGreeting": "Dear [owner name], as a fellow [industry] supporter...",
  "industryChallenge": "2 sentences about payment challenges specific to their industry",
  "proposedSolution": "2-3 sentences about how PCBancard solves their specific problems",
  "savingsHighlight": "Compelling presentation of their savings numbers",
  "equipmentRecommendation": "Terminal recommendation appropriate for their business type",
  "benefits": ["benefit 1", "benefit 2", "benefit 3", "benefit 4"],
  "callToAction": "Strong closing that references their business by name"
}

Be specific to ${merchantInfo.businessName}. Do NOT use generic placeholder text.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to generate content');
    }

    const content = JSON.parse(jsonMatch[0]);
    
    res.json({ success: true, content });

  } catch (error) {
    console.error('Content generation error:', error);
    res.status(500).json({ error: 'Failed to generate proposal content' });
  }
});
```

---

## SOLUTION 5: Generate Custom Savings Image

```typescript
// server/routes/generate-image.ts

app.post('/api/generate-savings-image', async (req, res) => {
  const { annualSavings, businessName, industry } = req.body;
  
  const formattedSavings = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(annualSavings);

  // Industry-based colors
  const industryColors = {
    'auto_repair': { primary: '#1e40af', secondary: '#3b82f6' },
    'restaurant': { primary: '#dc2626', secondary: '#f87171' },
    'retail': { primary: '#7c3aed', secondary: '#a78bfa' },
    'healthcare': { primary: '#059669', secondary: '#34d399' },
    'salon': { primary: '#db2777', secondary: '#f472b6' },
    'construction': { primary: '#d97706', secondary: '#fbbf24' },
    'fitness': { primary: '#0891b2', secondary: '#22d3ee' },
    'default': { primary: '#4f46e5', secondary: '#818cf8' }
  };

  const colors = industryColors[industry] || industryColors.default;

  const svg = `
<svg width="600" height="300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary}"/>
      <stop offset="100%" style="stop-color:${colors.secondary}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#bg)" rx="12"/>
  
  <!-- Decorative circles -->
  <circle cx="50" cy="50" r="80" fill="white" opacity="0.1"/>
  <circle cx="550" cy="250" r="100" fill="white" opacity="0.1"/>
  
  <!-- Content -->
  <text x="300" y="80" font-family="system-ui, -apple-system, sans-serif" font-size="22" fill="white" text-anchor="middle" opacity="0.9">
    Annual Savings with PCBancard
  </text>
  
  <!-- Main savings number -->
  <text x="300" y="170" font-family="system-ui, -apple-system, sans-serif" font-size="72" fill="white" text-anchor="middle" font-weight="bold" filter="url(#shadow)">
    ${formattedSavings}
  </text>
  
  <!-- Business name -->
  <text x="300" y="230" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="white" text-anchor="middle" opacity="0.9">
    for ${businessName}
  </text>
  
  <!-- Tagline -->
  <text x="300" y="270" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="white" text-anchor="middle" opacity="0.7">
    Switch to Dual Pricing • Keep More of What You Earn
  </text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
});
```

---

## Data Flow Summary

```
User Input (Form)
├── Salesperson Info (Required)
├── Merchant Website URL (Optional)
├── Merchant Contact Info (Optional - Expandable)
│   ├── Business Name (override)
│   ├── Industry (override)
│   ├── Owner Name/Title
│   ├── Phone/Email
│   └── Address
└── Statement PDF (Optional)
        │
        ▼
    MERGE LOGIC
    Priority: Manual Input > Scraped Data > Defaults
        │
        ▼
    Claude Analysis
    ├── Scrape website (if URL provided)
    ├── Detect industry from business name
    ├── Generate proposal content
    └── Generate custom images
        │
        ▼
    PDF Generation
    ├── Custom header with savings graphic
    ├── Merchant logo (scraped or Clearbit fallback)
    ├── Personalized content from Claude
    └── Salesperson contact info
```

---

## Quick Testing Checklist

After implementing:

1. ☐ Test Bob's Brake Muffler (https://www.autorepair-warminster.com)
   - Should detect "auto_repair" NOT "restaurant"
   - Should capture logo
   
2. ☐ Test with NO website URL
   - Should allow manual entry only
   
3. ☐ Test with partial manual override
   - Manual industry should override scraped
   
4. ☐ Verify no placeholders in output
   - No `{meta description}` or `{anything}`
   
5. ☐ Verify address/phone separation
   - Address should NOT contain phone number
