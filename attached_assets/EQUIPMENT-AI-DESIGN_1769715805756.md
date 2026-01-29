# PCBancard Equipment AI - Design Document

## Executive Summary

A standalone AI-powered equipment recommendation and training system for PCBancard sales agents. The system will index products from 6 vendors, provide intelligent recommendations based on merchant needs, and auto-update from vendor websites to stay current.

---

## Naming Recommendation

| Name | Pros | Cons | Verdict |
|------|------|------|---------|
| **EquipIQ** | Smart, memorable, implies intelligence | Generic | ⭐ **RECOMMENDED** |
| **GearGuide** | Friendly, approachable | Sounds consumer-focused | Good alternative |
| **Terminal Advisor** | Clear purpose | Boring, too literal | Pass |
| **PayPoint Pro** | Professional | Conflicts with existing brands | Pass |
| **The Equipment Desk** | Support-oriented | Too long | Pass |
| **StackMatch** | Implies matching solutions | Abstract | Pass |

**Final Recommendation: EquipIQ** - "Your Intelligent Equipment Partner"

Tagline options:
- "Match merchants to the perfect payment solution"
- "Smart recommendations for smarter sales"
- "Know your equipment. Win more deals."

---

## Vendor Product Catalog

### 1. SwipeSimple (by CardFlight)
**Website:** https://home.swipesimple.com
**Target:** Small businesses, mobile merchants, service providers
**Pricing Model:** Hardware + monthly SaaS

#### Hardware Products
| Product | Type | Best For | Key Features |
|---------|------|----------|--------------|
| SwipeSimple Terminal | All-in-one countertop | Small retail, quick service | Built-in printer, WiFi, 4G, accepts all cards |
| SwipeSimple Register | Full POS system | Growing businesses | Large touchscreen, inventory, employee mgmt |
| Card Readers | Mobile attachments | Mobile merchants | Connects to iOS/Android, EMV + NFC |
| Tap to Pay on iPhone | Software solution | Ultra-mobile | No hardware needed, iPhone only |

#### Software Features
- Virtual Terminal (MOTO)
- Invoicing (email/text)
- Payment Links
- Text to Pay
- Appointments scheduling
- Customer vault
- Reporting dashboard
- Mobile app (iOS/Android)

#### Verticals
- Food & Beverage
- Retail
- In-Person Services
- On-Site Technical Services

---

### 2. Dejavoo P-Series (Android Terminals)
**Website:** https://dejavoo.io
**Target:** All business types, ISO/agent friendly
**Pricing Model:** Terminal purchase + gateway fees

#### P-Line Terminals (Android)
| Model | Type | Screen | Printer | Best For |
|-------|------|--------|---------|----------|
| **P1** | Countertop | 8" touch | Built-in | High-volume retail, restaurants |
| **P3** | Wireless | 5.5" touch | Built-in | Mobile + countertop, all-purpose |
| **P5** | mPOS/PIN Pad | 5" touch | Optional | Integrations, retail checkout |
| **P8** | Wireless | 5.5" touch | None | Gateway integrations, mobile |
| **P12** | mPOS/PIN Pad | 2.4" | None | Quick service, mobile checkout |
| **P17** | PIN Pad | 4" touch | None | ADA-compliant, high-speed |
| **P18** | Wireless | 5.5" flip | Built-in | Customer-facing display |

#### Additional Lines
- **QD Line** - Rugged Android terminals (QD1-QD5)
- **Z Line** - Linux terminals (Z6, Z8, Z9, Z11) - legacy support

#### Software/Gateway
- iPOSpays Gateway (omni-commerce)
- DejaPayPro (cloud register)
- DVPay / DVPayLite
- SPIn (integration API)
- Dejavoo Extra (loyalty)
- DvStore (app marketplace)

---

### 3. MX POS (Priority Commerce)
**Website:** https://prioritycommerce.com/solutions/merchant-services/mx-pos/
**Target:** Restaurants, retail, salons
**Pricing Model:** Free hardware program available

#### Hardware
| Product | Type | Features |
|---------|------|----------|
| MX POS All-in-One | Countertop | 15.6" touch, built-in printer, optional 10" customer display |
| PAX A920 Pro | Mobile | Wireless ordering, tableside payment |
| MX Kiosk | Self-service | 21" vertical, built-in EMV cradle |
| PIN Pads | Add-on | PAX S300, PAX A35, Valor VL100, Valor VL300 |

#### Software Modules
| Module | Best For | Key Features |
|--------|----------|--------------|
| MX Restaurant | Full-service, QSR | KDS, table mgmt, online ordering, delivery integration |
| MX Retail | Stores, shops | Inventory, barcode scanning, EBT/food stamps |
| MX Salon | Beauty, wellness | Appointments, commission tracking, online booking |

#### Integrations
- QuickBooks Online sync
- Xero accounting
- Factor4 gift cards
- GiftYa
- e|tab online ordering
- Wix websites

#### Notable Features
- 600+ features
- Cash discount / surcharging
- Multi-language back office
- Cloud-based with local sync
- 24/7 support (7AM-12AM weekdays)

---

### 4. Hot Sauce POS (HotSauce Technologies)
**Website:** https://www.hotsaucepos.com
**Target:** Restaurants, bars, nightclubs
**Pricing Model:** Upfront + monthly license

#### Software Modules
| Module | Best For | Key Features |
|--------|----------|--------------|
| Table Service | Full-service restaurants | Split checks, table transfers, coursing |
| Quick Service | Fast food, cafes | Speed, counter service, cashier banking |
| Fast Bar | Bars, nightclubs | Tab management, bottle service, 12 hot keys |
| Delivery Express | Delivery, catering | Driver tracking, customer history, routing |

#### Hardware Package
- Elo touchscreen terminals
- PAX A920 for pay-at-table
- Thermal receipt printers
- Kitchen printers (impact or thermal)
- Cash drawers
- KDS (Kitchen Display System)

#### Key Differentiators
- **24/7 LIVE support** (pioneered this)
- **On-premise system** (not cloud - works offline)
- **Real-time data redundancy** (SQL Server replication)
- Training within 48 hours of purchase
- Face-to-face installation
- Spanish, Tagalog, Mandarin support

#### Pricing Example
- 1 workstation: ~$2,600 upfront + $65/month
- 4 workstations: ~$7,700 upfront + $260/month

---

### 5. Valor PayTech
**Website:** https://valorpaytech.com
**Target:** ISOs, ISVs, all merchant types
**Pricing Model:** Terminal purchase + processing

#### Hardware Categories

**Countertop POS**
| Model | Screen | Features |
|-------|--------|----------|
| VL100 Pro | Standard | Budget-friendly, reliable |
| VP100 | Touch | Engage My Customer ready |
| VP350 | 5.5" touch | Restaurants, retail |
| VP550C | Large touch | Cloud-ready, next-gen |

**PIN Pads**
| Model | Type | Features |
|-------|------|----------|
| VL300 | Budget | Security-driven, NFC |
| VP300 | Standard | Small business solution |
| VP300 Pro | Mobile | Contactless, hospitality |

**Wireless POS**
| Model | Features |
|-------|----------|
| VL110 | Startup-friendly, mobile |

**Next-Gen POS**
| Model | Features |
|-------|----------|
| VL550 | Signature capture |
| VP550 | Tap/dip/swipe + QR |
| VP550E | Extended enterprise Android |
| VP800 | Future-proof, Multi-Comm Hub |

**Mobile**
| Model | Features |
|-------|----------|
| RCKT | Ultra-mobile, small business |

#### Software Products
- Payment Gateway
- Virtual Terminal
- ValorPay Mobile App
- Dual Pricing (surcharge)
- The Vault (tokenization)
- Valor Updater (card updates)
- Valor Shield (chargebacks)
- Engage My Customer (marketing)

---

### 6. FluidPay (Gateway)
**Website:** https://www.fluidpay.com
**Target:** ISOs, VARs, payment professionals
**Pricing Model:** Gateway fees

#### Core Promise
**NON-COMPETE GUARANTEE** - Never boards merchants directly, never underwrite, never share data

#### Products (20+)
| Product | Category | Purpose |
|---------|----------|---------|
| Virtual Terminal | Processing | Web-based card entry |
| Customer Vault | Storage | Secure card storage |
| E-Invoicing | Billing | Email/SMS invoices |
| Recurring Billing | Subscriptions | Automated payments |
| Cash Discount | Fee offset | Pass fees to customer |
| Dual Pricing | Fee offset | Show cash vs card price |
| Surcharging | Fee offset | Add fee to card transactions |
| Level 3 Processing | B2B | Reduced interchange |
| Batch Processing | Efficiency | CSV upload processing |
| Tokenizer | Security | Hosted payment pages |
| Gateway Emulator | Migration | Easy processor switching |
| QuickBooks PaySync | Integration | Accounting sync |

#### Fraud Prevention
| Tool | Type | Features |
|------|------|----------|
| AttackDog | AI/ML | Machine learning fraud detection |
| WatchDog | Rules | Customizable rule-based filters |
| WatchDog Community Rules | Shared | Industry-wide fraud patterns |

#### Technical
- Cloud-native (Google Cloud Platform)
- Processor agnostic
- Private label available
- 99.5% uptime SLA
- Level 1 PCI compliant

---

## Recommendation Engine Logic

### Decision Tree

```
START
  │
  ├─► What type of business?
  │     ├─ Restaurant (full-service) ──► MX POS Restaurant OR Hot Sauce Table Service
  │     ├─ Restaurant (QSR/fast) ────► MX POS Restaurant OR Hot Sauce Quick Service
  │     ├─ Bar/Nightclub ────────────► Hot Sauce Fast Bar
  │     ├─ Retail ───────────────────► MX POS Retail OR Dejavoo P1
  │     ├─ Salon/Spa ────────────────► MX POS Salon
  │     ├─ Mobile/Service ───────────► SwipeSimple OR Dejavoo P3/P8
  │     └─ E-commerce only ──────────► FluidPay Gateway
  │
  ├─► Monthly volume?
  │     ├─ < $10K ───────────────────► SwipeSimple, Valor RCKT
  │     ├─ $10K - $50K ──────────────► Dejavoo P-series, Valor VP series
  │     ├─ $50K - $200K ─────────────► MX POS, Hot Sauce, Dejavoo P1
  │     └─ > $200K ──────────────────► Enterprise solutions, multi-terminal
  │
  ├─► Mobility needs?
  │     ├─ Countertop only ──────────► Dejavoo P1, Valor VP100, MX POS
  │     ├─ Some mobility ────────────► Dejavoo P3, Valor VL110
  │     ├─ Fully mobile ─────────────► SwipeSimple Terminal, Valor RCKT
  │     └─ Tableside (restaurant) ───► PAX A920 (with MX or Hot Sauce)
  │
  ├─► Integration needs?
  │     ├─ QuickBooks ───────────────► MX POS, FluidPay
  │     ├─ Existing POS ─────────────► FluidPay Gateway, Valor Gateway
  │     ├─ Custom software ──────────► Dejavoo SPIn, FluidPay API
  │     └─ Online ordering ──────────► MX POS e|tab, Hot Sauce Express
  │
  └─► Budget priority?
        ├─ Lowest upfront ───────────► SwipeSimple, MX POS (free hardware)
        ├─ Lowest monthly ───────────► Dejavoo (lower SaaS fees)
        └─ Best value ───────────────► Valor (competitive all-around)
```

### Competitive Positioning Matrix

| Need | Best Choice | Why |
|------|-------------|-----|
| Simple, fast setup | SwipeSimple | 125K+ merchants, proven easy |
| Full restaurant features | MX POS or Hot Sauce | KDS, table mgmt, online ordering |
| Bar/nightclub | Hot Sauce Fast Bar | Tab management, bottle service |
| Maximum terminal options | Dejavoo | 15+ models, Android & Linux |
| Dual pricing/surcharging | Valor or FluidPay | Built-in, compliant programs |
| Gateway-only (BYO terminal) | FluidPay | Non-compete, 20+ features |
| Offline reliability | Hot Sauce | On-premise SQL Server |
| ISO/agent portal | Valor | Partner-focused design |

---

## System Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        EquipIQ AI                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │   Product    │   │ Recommendation│   │   Training   │        │
│  │   Database   │   │    Engine     │   │    Module    │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            │                                    │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │   RAG/AI     │   │   Chat UI    │   │  Web Scraper │        │
│  │   Search     │   │  Interface   │   │  (Auto-sync) │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │SwipeSimple│   │  Dejavoo  │   │  MX POS  │
       │  Website  │   │  Website  │   │ Website  │
       └──────────┘    └──────────┘    └──────────┘
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │ Hot Sauce │   │   Valor   │   │ FluidPay │
       │  Website  │   │  Website  │   │  Website │
       └──────────┘    └──────────┘    └──────────┘
```

### Database Schema

```sql
-- Vendors
CREATE TABLE vendors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  website VARCHAR(255),
  description TEXT,
  logo_url VARCHAR(255),
  target_market TEXT,
  pricing_model VARCHAR(100),
  last_synced TIMESTAMP
);

-- Product Categories
CREATE TABLE product_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

-- Products
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  vendor_id INT REFERENCES vendors(id),
  category_id INT REFERENCES product_categories(id),
  name VARCHAR(200) NOT NULL,
  model VARCHAR(100),
  type VARCHAR(100), -- countertop, wireless, mobile, software, gateway
  description TEXT,
  features JSONB,
  specifications JSONB,
  best_for TEXT[],
  price_range VARCHAR(100),
  image_url VARCHAR(255),
  product_url VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Business Types
CREATE TABLE business_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  keywords TEXT[]
);

-- Product-Business Fit (many-to-many with score)
CREATE TABLE product_business_fit (
  product_id INT REFERENCES products(id),
  business_type_id INT REFERENCES business_types(id),
  fit_score INT CHECK (fit_score >= 1 AND fit_score <= 10),
  notes TEXT,
  PRIMARY KEY (product_id, business_type_id)
);

-- Comparison Points
CREATE TABLE comparison_points (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) -- price, features, support, integration
);

-- Product Comparisons
CREATE TABLE product_comparisons (
  product_id INT REFERENCES products(id),
  comparison_point_id INT REFERENCES comparison_points(id),
  value VARCHAR(255),
  score INT CHECK (score >= 1 AND score <= 10),
  PRIMARY KEY (product_id, comparison_point_id)
);

-- Embeddings for RAG
CREATE TABLE product_embeddings (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id),
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Sessions (for recommendation tracking)
CREATE TABLE recommendation_sessions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100),
  business_type VARCHAR(100),
  monthly_volume VARCHAR(50),
  mobility_needs VARCHAR(50),
  integration_needs TEXT[],
  budget_priority VARCHAR(50),
  recommended_products INT[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Auto-Sync System (Staying Current)

```javascript
// Scheduled job to check vendor websites for updates
// Runs daily at 2 AM

const VENDOR_CONFIGS = [
  {
    name: 'SwipeSimple',
    baseUrl: 'https://home.swipesimple.com',
    productPages: [
      '/swipesimple-terminal',
      '/swipesimple-register',
      '/payments',
      '/card-readers'
    ],
    selectors: {
      name: 'h1',
      description: '.product-description',
      features: '.feature-list li'
    }
  },
  {
    name: 'Dejavoo',
    baseUrl: 'https://dejavoo.io',
    productPages: [
      '/products/p-terminals-family/p1-secure-android-countertop/',
      '/products/p-terminals-family/p3-secure-android-wireless/',
      // ... etc
    ]
  },
  // ... other vendors
];

async function syncVendorProducts() {
  for (const vendor of VENDOR_CONFIGS) {
    for (const page of vendor.productPages) {
      const html = await fetch(vendor.baseUrl + page);
      const changes = detectChanges(html, vendor.selectors);
      
      if (changes.hasChanges) {
        await updateProductDatabase(vendor.name, page, changes);
        await regenerateEmbeddings(changes.productId);
        await notifyAdmin(vendor.name, changes);
      }
    }
  }
}
```

---

## API Endpoints

### Recommendation Engine

```
POST /api/recommend
Body: {
  business_type: "restaurant_fullservice" | "restaurant_qsr" | "bar" | "retail" | "salon" | "mobile" | "ecommerce",
  monthly_volume: "under_10k" | "10k_50k" | "50k_200k" | "over_200k",
  mobility_needs: "countertop" | "some_mobility" | "fully_mobile" | "tableside",
  integration_needs: ["quickbooks", "existing_pos", "online_ordering", "custom"],
  budget_priority: "lowest_upfront" | "lowest_monthly" | "best_value",
  special_requirements: string[]
}

Response: {
  primary_recommendation: { product, vendor, score, reasoning },
  alternatives: [{ product, vendor, score, reasoning }],
  comparison_chart: { ... },
  next_questions: string[]
}
```

### Product Search

```
GET /api/products/search?q=wireless+restaurant
GET /api/products/vendor/:vendorId
GET /api/products/category/:categoryId
GET /api/products/:productId
GET /api/products/compare?ids=1,2,3
```

### Training Mode

```
GET /api/training/quiz?vendor=dejavoo&difficulty=intermediate
POST /api/training/quiz/submit
GET /api/training/flashcards?category=terminals
GET /api/training/scenarios
```

### Sync Status

```
GET /api/sync/status
POST /api/sync/trigger/:vendorId
GET /api/sync/changelog
```

---

## Chat Interface Flows

### 1. Recommendation Flow

```
Agent: "I have a restaurant owner interested in a new POS system"

EquipIQ: "Great! Let me help you find the perfect solution. A few quick questions:

1. What type of restaurant?
   □ Full-service (sit-down, table service)
   □ Quick-service (counter, fast casual)
   □ Bar or nightclub
   □ Delivery/takeout focused

2. Approximate monthly card volume?
   □ Under $10,000
   □ $10,000 - $50,000
   □ $50,000 - $200,000
   □ Over $200,000

3. Do they need tableside ordering/payment?
   □ Yes, essential
   □ Nice to have
   □ No, counter only"

[Agent selects: Full-service, $50K-$200K, Yes essential]

EquipIQ: "Based on your inputs, here are my top recommendations:

🥇 **MX POS Restaurant** (Priority Commerce)
- Perfect fit for full-service with tableside needs
- Includes KDS, table management, online ordering
- PAX A920 Pro for tableside payments
- FREE hardware program available
- QuickBooks integration
- Score: 95/100

🥈 **Hot Sauce Table Service** (HotSauce Technologies)
- Excellent for high-volume restaurants
- 24/7 LIVE support (unique in industry)
- Works offline (on-premise SQL Server)
- Face-to-face installation included
- Score: 88/100

🥉 **Dejavoo P1 + DejaPayPro**
- High-volume countertop terminal
- Cloud register software
- Lower monthly fees
- Score: 82/100

Would you like me to:
• Compare specific features between these?
• Generate a proposal for any of these?
• Explain the pricing structure?"
```

### 2. Product Lookup Flow

```
Agent: "Tell me about the Valor VP550"

EquipIQ: "**Valor VP550** - Next-Gen Android POS

📱 **Overview**
The VP550 is Valor's flagship next-generation terminal, supporting tap/dip/swipe payments plus QR code acceptance.

🔧 **Specifications**
• Screen: Large touchscreen
• Connectivity: WiFi, Ethernet, 4G optional
• Printer: Built-in thermal
• OS: Android

✨ **Key Features**
• Dual pricing / surcharge support
• The Vault (tokenization)
• Engage My Customer (marketing tools)
• Valor Shield (chargeback protection)

🎯 **Best For**
• Retail stores
• Professional services
• Businesses wanting marketing tools
• ISOs needing flexible deployment

💰 **Pricing**
Terminal purchase + processing fees
Contact Valor for current pricing

🔗 [View on Valor website](https://valorpaytech.com/what-we-do/hardware-products/next-gen-pos/vp550/)

Would you like me to compare this to similar terminals from other vendors?"
```

### 3. Training Mode Flow

```
Agent: "Quiz me on SwipeSimple products"

EquipIQ: "📚 **SwipeSimple Product Quiz** (5 questions)

**Question 1 of 5:**
What is the main difference between SwipeSimple Terminal and SwipeSimple Register?

A) Terminal is wireless, Register is countertop
B) Terminal is all-in-one handheld, Register is a full POS system
C) Terminal is for restaurants, Register is for retail
D) Terminal requires monthly fees, Register is one-time purchase

[Agent answers B]

✅ **Correct!**

The SwipeSimple Terminal is a compact all-in-one device that fits in your hand with built-in printing. The SwipeSimple Register is a larger, more comprehensive POS system with advanced inventory and employee management features.

**Question 2 of 5:**
Which SwipeSimple solution requires NO hardware at all?
..."
```

---

## Implementation Phases

### Phase 1: Core Database & API (Week 1-2)
- [ ] PostgreSQL schema setup
- [ ] Seed data from all 6 vendors
- [ ] Basic CRUD API endpoints
- [ ] Product search with pgvector

### Phase 2: Recommendation Engine (Week 2-3)
- [ ] Decision tree logic
- [ ] Scoring algorithm
- [ ] Comparison chart generator
- [ ] API endpoints

### Phase 3: Chat Interface (Week 3-4)
- [ ] React/Replit frontend
- [ ] Conversational flows
- [ ] Product cards & comparisons
- [ ] Session management

### Phase 4: Training Module (Week 4-5)
- [ ] Quiz system
- [ ] Flashcards
- [ ] Progress tracking
- [ ] Scenario-based learning

### Phase 5: Auto-Sync System (Week 5-6)
- [ ] Web scraper for each vendor
- [ ] Change detection
- [ ] Embedding regeneration
- [ ] Admin notifications

---

## Files to Create

```
/equipment-ai/
├── README.md
├── package.json
├── .replit
├── database/
│   ├── schema.sql
│   ├── seed-vendors.sql
│   ├── seed-products.sql
│   └── seed-business-types.sql
├── server/
│   ├── index.js
│   ├── routes/
│   │   ├── products.js
│   │   ├── recommendations.js
│   │   ├── training.js
│   │   └── sync.js
│   ├── services/
│   │   ├── recommendationEngine.js
│   │   ├── productSearch.js
│   │   ├── webScraper.js
│   │   └── embeddings.js
│   └── data/
│       └── products.json
└── docs/
    ├── API.md
    └── VENDOR-CATALOG.md
```

---

## Next Steps

1. **Confirm name:** EquipIQ or alternative?
2. **Confirm scope:** Standalone app or integrate with existing coaching app?
3. **Priority features:** Recommendations first? Training first? Both parallel?
4. **Deployment:** Replit only or also consider alternatives?

Ready to build when you give the go-ahead!
