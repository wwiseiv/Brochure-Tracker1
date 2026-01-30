# Replit AI Prompt: Learn Card Brand Interchange

Copy and paste this entire prompt into Replit's AI assistant to teach it about interchange rates for building merchant services applications.

---

## PROMPT START

You are building a merchant services application for PCBancard. You need to understand interchange fees for the four major card brands. Learn and internalize the following information to help build accurate pricing tools, proposal generators, and cost calculators.

---

## What is Interchange?

Interchange is the fee paid by the merchant's bank (acquirer) to the cardholder's bank (issuer) every time a card transaction is processed. It's the largest component of credit card processing costs, typically 70-90% of total fees.

**Fee Structure:**
- Interchange fees are set by the card brands (Visa, Mastercard, Discover, Amex)
- Expressed as: **Percentage + Fixed Fee** (e.g., 1.65% + $0.10)
- Updated twice yearly: April and October

---

## Factors That Determine Interchange Rates

1. **Card Type** - Debit, credit, rewards, corporate, purchasing
2. **Card Present vs Not Present** - Swiped/dipped vs keyed/online
3. **Merchant Category Code (MCC)** - Retail, restaurant, supermarket, etc.
4. **Transaction Size** - Some categories have caps
5. **Data Level** - Level 1, 2, or 3 (B2B transactions)
6. **Authentication** - EMV chip, signature, PIN

---

## VISA INTERCHANGE RATES (2024-2025)

### Consumer Credit - Card Present (Retail)
| Category | Rate | Per Transaction |
|----------|------|-----------------|
| CPS Retail Credit | 1.65% | + $0.10 |
| CPS Retail - Debit | 0.80% | + $0.15 |
| CPS Rewards 1 | 1.65% | + $0.10 |
| CPS Rewards 2 | 1.95% | + $0.10 |
| Signature Preferred | 2.10% | + $0.10 |
| Infinite | 2.30% | + $0.10 |

### Consumer Credit - Card Not Present (Ecommerce/Keyed)
| Category | Rate | Per Transaction |
|----------|------|-----------------|
| CPS E-Commerce Basic | 1.80% | + $0.10 |
| CPS E-Commerce Preferred | 1.95% | + $0.10 |
| Card Not Present | 1.80% | + $0.10 |
| Standard | 2.70% | + $0.10 |

### Restaurant
| Category | Rate | Per Transaction |
|----------|------|-----------------|
| CPS Restaurant | 1.54% | + $0.10 |
| CPS Restaurant - Debit | 0.80% | + $0.15 |

### Supermarket
| Category | Rate | Per Transaction |
|----------|------|-----------------|
| CPS Supermarket | 1.22% | + $0.05 |
| CPS Supermarket - Debit | 0.80% | + $0.15 |

### Debit Cards (Regulated - Durbin Amendment)
| Category | Rate | Per Transaction |
|----------|------|-----------------|
| Regulated Debit | 0.05% | + $0.21 (capped) |
| Regulated Debit - Small Issuer | 0.80% | + $0.15 |

### Business/Corporate Cards
| Category | Rate | Per Transaction |
|----------|------|-----------------|
| Commercial Card Present | 2.50% | + $0.10 |
| Commercial Card Not Present | 2.70% | + $0.10 |
| Purchasing Card Level 2 | 2.50% | + $0.10 |
| Purchasing Card Level 3 | 2.30% | + $0.10 |

---

## MASTERCARD INTERCHANGE RATES (2024-2025)

### Consumer Credit - Card Present (Retail)
| Category | Rate | Per Transaction |
|----------|------|-----------------|
| Merit I | 1.58% | + $0.10 |
| Merit III (Supermarket) | 1.48% | + $0.05 |
| Enhanced Merit I | 1.73% | + $0.10 |
| World | 1.73% | + $0.10 |
| World Elite | 2.05% | + $0.10 |
| World High Value | 2.30% | + $0.10 |

### Consumer Credit - Card Not Present
| Category | Rate | Per Transaction |
|----------|------|-----------------|
| Merit I CNP | 1.83% | + $0.10 |
| World CNP | 1.98% | + $0.10 |
| World Elite CNP | 2.30% | + $0.10 |
| Standard | 2.65% | + $0.10 |

### Restaurant
| Category | Rate | Per Transaction |
|----------|------|-----------------|
| Restaurant | 1.47% | + $0.10 |
| Quick Service Restaurant | 1.47% | + $0.05 |

### Debit Cards
| Category | Rate | Per Transaction |
|----------|------|-----------------|
| Debit Merit I | 0.80% | + $0.15 |
| Debit Merit III | 0.80% | + $0.15 |
| Regulated Debit | 0.05% | + $0.21 (capped) |

### Commercial/Corporate
| Category | Rate | Per Transaction |
|----------|------|-----------------|
| Commercial Base | 2.50% | + $0.10 |
| Commercial Data Rate I | 2.65% | + $0.10 |
| Large Ticket | 2.50% | + $0.10 (capped at $100) |

---

## DISCOVER INTERCHANGE RATES (2024-2025)

### Consumer Credit - Card Present
| Category | Rate | Per Transaction |
|----------|------|-----------------|
| Retail | 1.56% | + $0.10 |
| Rewards | 1.71% | + $0.10 |
| Premium Plus | 1.87% | + $0.10 |
| Premium Plus Rewards | 2.15% | + $0.10 |

### Consumer Credit - Card Not Present
| Category | Rate | Per Transaction |
|----------|------|-----------------|
| E-Commerce | 1.81% | + $0.10 |
| MOTO (Mail Order/Telephone) | 1.87% | + $0.10 |
| Standard | 2.40% | + $0.10 |

### Restaurant
| Category | Rate | Per Transaction |
|----------|------|-----------------|
| Restaurant | 1.40% | + $0.10 |
| Quick Service | 1.40% | + $0.05 |

### Supermarket
| Category | Rate | Per Transaction |
|----------|------|-----------------|
| Supermarket | 1.15% | + $0.05 |

### Debit Cards
| Category | Rate | Per Transaction |
|----------|------|-----------------|
| PIN Debit | 0.80% | + $0.15 |
| Signature Debit | 0.80% | + $0.15 |

---

## AMERICAN EXPRESS INTERCHANGE (OptBlue Program)

American Express operates differently - traditionally merchants had a direct relationship with Amex. The **OptBlue program** allows acquirers to set pricing similar to Visa/MC.

### OptBlue Rates (Acquirer-set, approximate)
| Category | Rate | Per Transaction |
|----------|------|-----------------|
| Retail Card Present | 1.60% - 2.40% | + $0.10 |
| Restaurant | 1.55% - 2.30% | + $0.10 |
| Supermarket | 1.30% - 2.00% | + $0.10 |
| E-Commerce | 1.85% - 2.70% | + $0.10 |
| Card Not Present | 2.00% - 2.90% | + $0.10 |

### Traditional Amex (Direct)
| Category | Rate |
|----------|------|
| Retail | 2.50% - 3.50% |
| Restaurant | 2.30% - 3.30% |
| E-Commerce | 2.70% - 3.50% |

---

## DOWNGRADES - Why Transactions Cost More

Transactions "downgrade" to higher rates when they don't meet qualification requirements:

### Common Downgrade Reasons:
1. **Not settled within 24-48 hours** - Batch not closed
2. **AVS not used** - Address verification required for CNP
3. **Missing data** - Invoice number, customer code
4. **Keyed instead of swiped** - Card present but manually entered
5. **No CVV for CNP** - Security code not collected

### Downgrade Rate Increase:
- Typical downgrade adds **0.50% - 1.50%** to the transaction
- Example: 1.65% → 2.70% (Standard/EIRF rate)

---

## DUAL PRICING / CASH DISCOUNT PROGRAMS

PCBancard offers dual pricing where customers pay a service fee for card use:

### How It Works:
- **Cash Price:** Listed price (e.g., $100.00)
- **Card Price:** Cash price + service fee (e.g., $103.99)
- **Service Fee:** Typically 3.00% - 3.99%

### Effective Cost to Merchant:
With dual pricing, the merchant's effective interchange cost approaches **0%** because the fee is passed to the cardholder.

### Compliance Requirements:
- Must clearly disclose pricing
- Posted signage required
- Receipt must show both prices
- Cannot exceed card brand surcharge limits (4% max)

---

## CALCULATING EFFECTIVE RATE

The **effective rate** is the total processing cost divided by total volume:

```
Effective Rate = (Total Fees / Total Volume) × 100
```

### Example Calculation:
```
Monthly Volume: $50,000
Interchange Fees: $750 (1.50% average)
Assessment Fees: $65 (0.13%)
Processor Markup: $100 (0.20%)
Monthly Fee: $25
Statement Fee: $10
PCI Fee: $10
------------------------
Total Fees: $960
Effective Rate: $960 / $50,000 = 1.92%
```

---

## ASSESSMENT FEES (Pass-Through)

In addition to interchange, card brands charge assessment fees:

| Brand | Assessment | Notes |
|-------|------------|-------|
| Visa | 0.13% | + $0.0195 FANF per location |
| Mastercard | 0.13% | + $0.0195 per transaction (some) |
| Discover | 0.13% | |
| American Express | 0.15% | OptBlue program |

---

## IMPLEMENTATION GUIDELINES

When building pricing tools for PCBancard:

### 1. Pricing Calculator
```javascript
function calculateInterchange(volume, avgTicket, cardMix, merchantType) {
  // cardMix = { visa: 0.40, mc: 0.30, discover: 0.10, amex: 0.15, debit: 0.05 }
  // Use weighted average of interchange rates
  // Add assessments
  // Add processor markup
}
```

### 2. Proposal Generator
- Show interchange + assessments as "wholesale cost"
- Show processor markup separately
- Calculate effective rate
- Compare to current processor (savings analysis)

### 3. Statement Analysis
- Parse existing statements to identify:
  - Current effective rate
  - Interchange categories
  - Downgrades
  - Hidden fees

### 4. Dual Pricing Calculator
- Input: Monthly volume, average ticket
- Output: Savings with dual pricing vs traditional
- Show fee per transaction

---

## KEY RATES TO MEMORIZE

For quick estimates, use these **average interchange rates**:

| Card Type | Card Present | Card Not Present |
|-----------|--------------|------------------|
| Debit (Regulated) | 0.05% + $0.21 | 0.05% + $0.21 |
| Debit (Unregulated) | 0.80% + $0.15 | 1.00% + $0.15 |
| Credit (Basic) | 1.65% + $0.10 | 1.80% + $0.10 |
| Credit (Rewards) | 1.95% + $0.10 | 2.10% + $0.10 |
| Credit (Premium) | 2.30% + $0.10 | 2.50% + $0.10 |
| Corporate | 2.50% + $0.10 | 2.70% + $0.10 |
| Amex (OptBlue) | 2.00% + $0.10 | 2.40% + $0.10 |

---

## RESOURCES

- Visa Interchange: https://usa.visa.com/support/merchant/library/visa-merchant-business-news-digest.html
- Mastercard Interchange: https://www.mastercard.us/en-us/business/overview/support/merchant-interchange-rates.html
- Discover Interchange: https://www.discoverglobalnetwork.com/solutions/interchange/
- Durbin Amendment (Regulated Debit): Federal Reserve Regulation II

---

## YOUR TASK

Use this interchange knowledge to:

1. **Build accurate pricing calculators** for merchant proposals
2. **Create statement analysis tools** to show savings
3. **Implement dual pricing calculations** showing effective cost reduction
4. **Generate professional proposals** with interchange breakdowns
5. **Help merchants understand** their processing costs

Remember: Interchange is wholesale cost - it's non-negotiable. The processor's markup on top of interchange is where pricing competition happens.

---

## PROMPT END
