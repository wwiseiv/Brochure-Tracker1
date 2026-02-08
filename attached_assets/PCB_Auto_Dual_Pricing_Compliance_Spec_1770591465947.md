# PCB Auto — Dual Pricing Compliance & Reporting Spec

**For:** Replit AI / Developer
**Date:** February 8, 2026
**Priority:** CRITICAL — This is a legal and compliance requirement, not a preference.

---

## 1. The Rule (Read This First)

**Dual pricing is NOT surcharging.** They are legally different programs.

**Surcharging** = one price + a fee added at checkout for using a card. This requires specific disclosures, signage, advance notice to card networks, and is banned in several states (Connecticut, Massachusetts, Maine, Oklahoma, etc.).

**Dual pricing** = two prices displayed from the beginning. A cash price and a card price. No fee is ever added. The customer simply chooses which price they want to pay. This is legal in all 50 states.

**PCB Auto uses dual pricing. Period.**

### What the customer NEVER sees:
- ❌ The word "surcharge"
- ❌ The word "fee" (in any context related to payment method)
- ❌ A line item showing a dollar amount added for paying with card
- ❌ "Processing fee," "convenience fee," "service charge," or "card fee"
- ❌ A single price with an amount added on top at checkout
- ❌ Any math showing "base price + X% = card price"

### What the customer ALWAYS sees:
- ✅ Two prices side by side: **Cash Price** and **Card Price**
- ✅ Both prices displayed from the very first moment (estimate, invoice, payment screen, text link)
- ✅ The card price is simply the price — not "cash price + fee"
- ✅ Payment buttons show the actual dollar amount: "Pay Cash — $549.64" and "Pay Card — $568.82"

---

## 2. Customer-Facing Screens — What They See

### 2.1 Estimate (sent via text or email)

```
┌─────────────────────────────────────────────┐
│         Demo Auto Repair                     │
│         Estimate for Robert Smith            │
│         2019 Ford F-150 XLT                  │
│                                              │
│  Front Brake Pad & Rotor Replacement         │
│    Labor (1.5 hrs)                           │
│    Bosch QuietCast Brake Pads                │
│    ACDelco Advantage Rotors                  │
│                                              │
│  Serpentine Belt Replacement                 │
│    Labor (0.5 hrs)                           │
│    Gates Micro-V Belt                        │
│                                              │
│  ─────────────────────────────────────────   │
│                                              │
│         Cash Price     Card Price            │
│          $549.64        $568.82              │
│                                              │
│    [ Approve Estimate ]                      │
└─────────────────────────────────────────────┘
```

**Rules:**
- Line items show descriptions only — no per-line cash/card split needed
- The ONLY place pricing splits is the total at the bottom
- Both totals are always visible, always side by side
- No footnotes explaining "why" the card price is higher
- No asterisks, no fine print about fees

### 2.2 Invoice (sent via text, email, or viewed on screen)

```
┌─────────────────────────────────────────────┐
│  INVOICE                     RO #1001       │
│  Demo Auto Repair            Feb 8, 2026    │
│                                              │
│  Robert Smith                                │
│  2019 Ford F-150 XLT                        │
│                                              │
│  Description                     Amount      │
│  ──────────────────────────────────────────  │
│  Front Brake Pad & Rotor Repl.   $356.24    │
│    Labor — 1.5 hrs × $125/hr                │
│    Bosch QuietCast Pads                      │
│    ACDelco Advantage Rotors                  │
│  Serpentine Belt Replacement      $97.49     │
│    Labor — 0.5 hrs × $125/hr                │
│    Gates Micro-V Belt                        │
│  Air Filter Replacement           $32.99     │
│    Labor — 0.1 hrs × $125/hr                │
│    Fram Extra Guard Filter                   │
│  Shop Supplies                    $26.96     │
│  ──────────────────────────────────────────  │
│  Subtotal                        $513.68     │
│  Tax (7%)                         $35.96     │
│                                              │
│  ┌───────────────┐  ┌───────────────┐       │
│  │  Cash Price   │  │  Card Price   │       │
│  │   $549.64     │  │   $568.82     │       │
│  └───────────────┘  └───────────────┘       │
│                                              │
└─────────────────────────────────────────────┘
```

**Rules:**
- Line item amounts are shown as single amounts (these are the "base" amounts)
- Subtotal and tax are shown once
- Then the two final totals: Cash Price and Card Price
- NO line between tax and the totals that says "surcharge" or "card fee"
- The card price just IS the card price — it's not calculated visually in front of the customer

### 2.3 Payment Screen (iPad in-shop, terminal, or payment link)

This is the most critical screen. The customer is choosing how to pay RIGHT NOW.

```
┌──────────────────────────────────────────────┐
│                                               │
│          How would you like to pay?           │
│                                               │
│  ┌─────────────────────┐ ┌─────────────────┐ │
│  │                     │ │                  │ │
│  │     💵 CASH         │ │     💳 CARD      │ │
│  │                     │ │                  │ │
│  │     $549.64         │ │     $568.82      │ │
│  │                     │ │                  │ │
│  └─────────────────────┘ └─────────────────┘ │
│                                               │
│         2019 Ford F-150 XLT                   │
│         RO #1001 · Robert Smith               │
│                                               │
└──────────────────────────────────────────────┘
```

**Rules:**
- Two BIG buttons, equal size, equal prominence
- Each button shows the payment method AND the dollar amount
- Cash is NOT labeled as "discounted" — it's just the cash price
- Card is NOT labeled as "includes fee" — it's just the card price
- No explanatory text about why the prices differ
- The customer taps one or the other. That's it.
- On tap → proceeds to payment flow for that method

**After tapping Card:**
```
┌──────────────────────────────────────────────┐
│                                               │
│          Card Payment — $568.82               │
│                                               │
│  ┌──────────────────────────────────────────┐│
│  │                                          ││
│  │    [Card entry form / terminal prompt]   ││
│  │                                          ││
│  └──────────────────────────────────────────┘│
│                                               │
│  + Add Tip                                    │
│    No Tip · 10% · 15% · 20% · Custom         │
│                                               │
│         Total: $568.82                        │
│                                               │
│         [ Process Payment ]                   │
│                                               │
└──────────────────────────────────────────────┘
```

**After tapping Cash:**
```
┌──────────────────────────────────────────────┐
│                                               │
│          Cash Payment — $549.64               │
│                                               │
│  + Add Tip                                    │
│    No Tip · 10% · 15% · 20% · Custom         │
│                                               │
│         Total: $549.64                        │
│                                               │
│         [ Complete Payment ]                  │
│                                               │
└──────────────────────────────────────────────┘
```

### 2.4 Receipt (printed, emailed, or texted)

```
┌──────────────────────────────────────────────┐
│          Demo Auto Repair                     │
│          123 Main St, Carmel, IN 46032        │
│          (317) 555-0100                        │
│                                               │
│  RO #1001              Feb 8, 2026 3:42 PM   │
│  Robert Smith                                 │
│  2019 Ford F-150 XLT                         │
│                                               │
│  Front Brake Pad & Rotor Repl.   $356.24     │
│  Serpentine Belt Replacement      $97.49      │
│  Air Filter Replacement           $32.99      │
│  Shop Supplies                    $26.96      │
│  ──────────────────────────────────────────   │
│  Subtotal                        $513.68      │
│  Tax                              $35.96      │
│  ──────────────────────────────────────────   │
│                                               │
│  PAID — Card (Visa ····4821)                  │
│  Amount:              $568.82                 │
│  Tip:                   $0.00                 │
│  Total Charged:       $568.82                 │
│  Auth: A847291                                │
│                                               │
│         Thank you for your business!          │
│                                               │
└──────────────────────────────────────────────┘
```

**Rules for receipts:**
- Shows the amount they actually paid — ONE number
- Does NOT show both cash and card prices after payment (they already chose)
- Does NOT show a "surcharge" line item
- Does NOT break out "base price + fee = total"
- Simply shows: what they bought, the tax, and the total they paid
- Payment method and auth code for card payments

### 2.5 Payment Link (texted to customer)

When the advisor texts a payment link, the customer opens it in their phone browser:

```
Text message:
"Hi Robert, your vehicle is ready! Total for your 2019 F-150:
Cash $549.64 · Card $568.82
Pay here: https://pay.pcbisv.com/ro/abc123"
```

The link opens to the same Payment Screen (Section 2.3) — two buttons, cash price and card price.

---

## 3. Terminal Integration

When the advisor taps "Push to Terminal" from the PCB Auto RO:

1. PCB Auto sends the SELECTED amount to the terminal (cash or card amount — whichever the customer chose)
2. If the customer chose Card → the terminal receives $568.82 as the total
3. If the customer chose Cash → no terminal needed, but if they change their mind at the counter and want to pay card, the terminal receives the card price

**The terminal NEVER shows a fee.** It just shows the total amount. The dual pricing decision happens BEFORE the terminal — in PCB Auto's payment screen.

---

## 4. Backend: What the Shop Owner Sees

This is where the math lives. The shop owner needs to know EXACTLY how much the dual pricing program is earning them. But this is admin-only — customers never see this.

### 4.1 Data Model

Every payment record stores:

```typescript
interface PaymentRecord {
  id: string;
  roId: string;
  roNumber: string;
  
  // Customer info
  customerId: string;
  customerName: string;
  
  // Vehicle info
  vehicleId: string;
  vehicleDescription: string;  // "2019 Ford F-150 XLT"
  
  // Amounts
  subtotal: number;            // Before tax
  taxAmount: number;
  taxRate: number;
  cashPrice: number;           // subtotal + tax
  cardPrice: number;           // cashPrice + (cashPrice × dualPricingRate)
  dualPricingRate: number;     // e.g. 0.0349 (3.49%)
  dualPricingAmount: number;   // cardPrice - cashPrice (the difference)
  
  // What actually happened
  paymentMethod: 'cash' | 'card';
  amountCharged: number;       // What the customer actually paid
  tipAmount: number;
  totalCollected: number;      // amountCharged + tip
  
  // Card details (if card)
  cardBrand?: string;          // Visa, Mastercard, etc.
  cardLast4?: string;
  authCode?: string;
  
  // Revenue tracking (admin only)
  netRevenue: number;          // cashPrice (what the shop "earns" regardless of method)
  dualPricingRevenue: number;  // If card: dualPricingAmount. If cash: 0
  processingCostEstimate: number; // Estimated processing fee (if card)
  
  // Metadata
  processedAt: Date;
  processedBy: string;         // Advisor who took payment
  paymentChannel: 'in-store' | 'payment-link' | 'terminal';
  
  // Status
  status: 'completed' | 'refunded' | 'partial-refund' | 'voided';
  refundAmount?: number;
  refundedAt?: Date;
}
```

### 4.2 Admin Dashboard — Revenue Widget

The shop owner's dashboard shows a revenue summary that includes dual pricing insights:

```
┌──────────────────────────────────────────────────────┐
│  Today's Revenue                                      │
│                                                       │
│  Total Collected        $4,287.50                     │
│  ├── Cash Payments      $1,842.00  (8 transactions)  │
│  └── Card Payments      $2,445.50  (14 transactions) │
│                                                       │
│  Dual Pricing Earned     $167.32                      │
│  (from 14 card transactions)                          │
│                                                       │
│  ◉ Cash  38%  ◉ Card  62%                            │
│  ████████████░░░░░░░░░░░░░░░░░                       │
└──────────────────────────────────────────────────────┘
```

**"Dual Pricing Earned"** = the total difference between card price and cash price across all card transactions. This is the amount that covers the shop's processing costs. For cash transactions this is $0 (the shop avoided the fee entirely).

### 4.3 Admin Reports

The shop owner can pull detailed reports. These are ADMIN ONLY — never customer-facing.

**Report: Dual Pricing Summary**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Dual Pricing Report — February 1-8, 2026                          │
│                                                                     │
│  Total Transactions:          87                                    │
│  Cash Transactions:           34  (39%)                             │
│  Card Transactions:           53  (61%)                             │
│                                                                     │
│  Total Revenue (Cash Basis):  $38,420.00                           │
│  Dual Pricing Collected:       $1,987.42                           │
│  (sum of card price - cash price on all card transactions)         │
│                                                                     │
│  Estimated Processing Costs:   $1,654.80                           │
│  Net Dual Pricing Benefit:      $332.62                            │
│  (collected more than processing costs)                            │
│                                                                     │
│  Effective Rate Charged:       3.49%                                │
│  Avg Transaction (Cash):       $456.12                              │
│  Avg Transaction (Card):       $472.03                              │
│                                                                     │
│                              [ Download Excel ]                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Report: Transaction Detail**

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  Transaction Detail — February 1-8, 2026                    [ Download Excel ]       │
│                                                                                      │
│  Date      │ RO#   │ Customer       │ Vehicle          │ Method │ Cash    │ Card    │ Paid    │ DP Amt  │
│  ──────────┼───────┼────────────────┼──────────────────┼────────┼─────────┼─────────┼─────────┼─────────│
│  Feb 8     │ 1001  │ Robert Smith   │ '19 F-150        │ Card   │ $549.64 │ $568.82 │ $568.82 │ $19.18  │
│  Feb 8     │ 1002  │ Maria Garcia   │ '22 Camry        │ Cash   │ $312.00 │ $322.89 │ $312.00 │ $0.00   │
│  Feb 7     │ 0998  │ James Wilson   │ '20 Silverado    │ Card   │ $891.20 │ $922.31 │ $922.31 │ $31.11  │
│  Feb 7     │ 0997  │ Lisa Chen      │ '21 CR-V         │ Card   │ $267.50 │ $276.83 │ $276.83 │ $9.33   │
│  Feb 7     │ 0996  │ Tom Davis      │ '18 Accord       │ Cash   │ $445.00 │ $460.53 │ $445.00 │ $0.00   │
│  ...                                                                                            │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Column definitions:
- **Cash** = the cash price for this RO
- **Card** = the card price for this RO
- **Paid** = what the customer actually paid (matches cash or card column)
- **DP Amt** = Dual Pricing Amount (card price minus cash price — only if they paid card, otherwise $0)

---

## 5. Excel Export

When the shop owner clicks **Download Excel**, generate a properly formatted .xlsx file.

### 5.1 Transaction Detail Export

**Filename:** `PCB_Auto_Transactions_Feb_1-8_2026.xlsx`

**Sheet 1: "Transactions"**

| Date | RO # | Customer | Vehicle | Payment Method | Cash Price | Card Price | Amount Paid | Tip | Total Collected | Dual Pricing Amt | Card Brand | Last 4 | Auth Code | Advisor | Channel |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2/8/2026 | 1001 | Robert Smith | 2019 Ford F-150 XLT | Card | $549.64 | $568.82 | $568.82 | $0.00 | $568.82 | $19.18 | Visa | 4821 | A847291 | Mike | In-Store |
| 2/8/2026 | 1002 | Maria Garcia | 2022 Toyota Camry LE | Cash | $312.00 | $322.89 | $312.00 | $5.00 | $317.00 | $0.00 | — | — | — | Mike | In-Store |

**Formatting requirements:**
- Header row: bold, dark background (#111827), white text, frozen row
- Currency columns: formatted as currency ($#,##0.00)
- Date column: formatted as date (M/D/YYYY)
- Alternating row colors (white / light gray #f9fafb)
- Auto-fit column widths
- Filter dropdowns on header row (Excel auto-filter)

**Sheet 2: "Summary"**

| Metric | Value |
|---|---|
| Report Period | Feb 1-8, 2026 |
| Total Transactions | 87 |
| Cash Transactions | 34 |
| Card Transactions | 53 |
| Cash Percentage | 39% |
| Card Percentage | 61% |
| Total Revenue (Cash Basis) | $38,420.00 |
| Total Dual Pricing Collected | $1,987.42 |
| Average Transaction (Cash) | $456.12 |
| Average Transaction (Card) | $472.03 |
| Dual Pricing Rate | 3.49% |

**Formatting:**
- Metric labels in bold
- Currency values formatted as currency
- Percentage values formatted as percentage
- Clean borders, professional appearance

### 5.2 Backend: Excel Generation Endpoint

```typescript
// server/routes/reports.ts

import express from 'express';
import ExcelJS from 'exceljs';  // npm install exceljs

const router = express.Router();

// GET /api/pcbauto/v1/reports/transactions/export?start=2026-02-01&end=2026-02-08
router.get('/transactions/export', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    // Fetch transactions from database
    const transactions = await getTransactions(start as string, end as string);
    
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PCB Auto';
    workbook.created = new Date();
    
    // ============================
    // Sheet 1: Transactions
    // ============================
    const txSheet = workbook.addWorksheet('Transactions');
    
    // Define columns
    txSheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'RO #', key: 'roNumber', width: 10 },
      { header: 'Customer', key: 'customerName', width: 22 },
      { header: 'Vehicle', key: 'vehicleDescription', width: 26 },
      { header: 'Payment Method', key: 'paymentMethod', width: 16 },
      { header: 'Cash Price', key: 'cashPrice', width: 14, style: { numFmt: '$#,##0.00' } },
      { header: 'Card Price', key: 'cardPrice', width: 14, style: { numFmt: '$#,##0.00' } },
      { header: 'Amount Paid', key: 'amountCharged', width: 14, style: { numFmt: '$#,##0.00' } },
      { header: 'Tip', key: 'tipAmount', width: 10, style: { numFmt: '$#,##0.00' } },
      { header: 'Total Collected', key: 'totalCollected', width: 16, style: { numFmt: '$#,##0.00' } },
      { header: 'Dual Pricing Amt', key: 'dualPricingAmount', width: 18, style: { numFmt: '$#,##0.00' } },
      { header: 'Card Brand', key: 'cardBrand', width: 12 },
      { header: 'Last 4', key: 'cardLast4', width: 8 },
      { header: 'Auth Code', key: 'authCode', width: 12 },
      { header: 'Advisor', key: 'processedBy', width: 14 },
      { header: 'Channel', key: 'paymentChannel', width: 12 },
    ];
    
    // Style header row
    const headerRow = txSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FF111827' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;
    
    // Add data rows
    transactions.forEach((tx, i) => {
      const row = txSheet.addRow({
        date: new Date(tx.processedAt),
        roNumber: tx.roNumber,
        customerName: tx.customerName,
        vehicleDescription: tx.vehicleDescription,
        paymentMethod: tx.paymentMethod === 'card' ? 'Card' : 'Cash',
        cashPrice: tx.cashPrice,
        cardPrice: tx.cardPrice,
        amountCharged: tx.amountCharged,
        tipAmount: tx.tipAmount,
        totalCollected: tx.totalCollected,
        dualPricingAmount: tx.paymentMethod === 'card' ? tx.dualPricingAmount : 0,
        cardBrand: tx.cardBrand || '—',
        cardLast4: tx.cardLast4 || '—',
        authCode: tx.authCode || '—',
        processedBy: tx.processedBy,
        paymentChannel: tx.paymentChannel,
      });
      
      // Alternating row colors
      if (i % 2 === 1) {
        row.fill = {
          type: 'pattern', pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        };
      }
      
      // Format date column
      row.getCell('date').numFmt = 'm/d/yyyy';
    });
    
    // Freeze header row + auto-filter
    txSheet.views = [{ state: 'frozen', ySplit: 1 }];
    txSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: transactions.length + 1, column: 16 },
    };
    
    // ============================
    // Sheet 2: Summary
    // ============================
    const sumSheet = workbook.addWorksheet('Summary');
    
    const cashTx = transactions.filter(t => t.paymentMethod === 'cash');
    const cardTx = transactions.filter(t => t.paymentMethod === 'card');
    const totalCashBasis = transactions.reduce((s, t) => s + t.cashPrice, 0);
    const totalDPCollected = cardTx.reduce((s, t) => s + t.dualPricingAmount, 0);
    const avgCash = cashTx.length > 0 ? cashTx.reduce((s, t) => s + t.amountCharged, 0) / cashTx.length : 0;
    const avgCard = cardTx.length > 0 ? cardTx.reduce((s, t) => s + t.amountCharged, 0) / cardTx.length : 0;
    
    sumSheet.columns = [
      { header: 'Metric', key: 'metric', width: 32 },
      { header: 'Value', key: 'value', width: 22 },
    ];
    
    // Style header
    const sumHeader = sumSheet.getRow(1);
    sumHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    sumHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
    sumHeader.height = 28;
    
    const summaryData = [
      { metric: 'Report Period', value: `${start} to ${end}` },
      { metric: 'Total Transactions', value: transactions.length },
      { metric: 'Cash Transactions', value: cashTx.length },
      { metric: 'Card Transactions', value: cardTx.length },
      { metric: 'Cash Percentage', value: `${((cashTx.length / transactions.length) * 100).toFixed(0)}%` },
      { metric: 'Card Percentage', value: `${((cardTx.length / transactions.length) * 100).toFixed(0)}%` },
      { metric: 'Total Revenue (Cash Basis)', value: `$${totalCashBasis.toFixed(2)}` },
      { metric: 'Total Dual Pricing Collected', value: `$${totalDPCollected.toFixed(2)}` },
      { metric: 'Average Transaction (Cash)', value: `$${avgCash.toFixed(2)}` },
      { metric: 'Average Transaction (Card)', value: `$${avgCard.toFixed(2)}` },
      { metric: 'Dual Pricing Rate', value: `${(transactions[0]?.dualPricingRate * 100 || 3.49).toFixed(2)}%` },
    ];
    
    summaryData.forEach((row, i) => {
      const r = sumSheet.addRow(row);
      r.getCell('metric').font = { bold: true };
      if (i % 2 === 1) {
        r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      }
    });
    
    // ============================
    // Send file
    // ============================
    const filename = `PCB_Auto_Transactions_${start}_to_${end}.xlsx`;
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (err: any) {
    console.error('Report export error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
```

### 5.3 Install Dependency

```bash
npm install exceljs
```

---

## 6. All Payment Channels — Consistent Behavior

No matter HOW the customer pays, they see the same thing:

| Channel | What Customer Sees | What Happens |
|---|---|---|
| **iPad at counter** | Two buttons: "Cash $549.64" / "Card $568.82" | Taps one. Card → processes on device. Cash → advisor marks paid. |
| **Text payment link** | Text says "Cash $549.64 · Card $568.82" + link. Link opens two-button payment page. | Taps card → enters card in mobile browser. |
| **Email invoice** | Invoice with dual pricing at bottom. "Pay Now" button opens payment page. | Same two-button choice. |
| **Terminal push** | PCB Auto shows dual pricing choice first. After customer chooses, pushes THAT amount to terminal. | Terminal displays one number — the selected amount. No fee visible. |
| **In-person (advisor screen)** | Advisor sees both prices. Asks customer "cash or card?" Selects the method. | If card → swipe/tap/insert on terminal at card price. |

---

## 7. Language Rules for the Entire Application

### Words to NEVER use (customer-facing):

```
surcharge
fee
processing fee
convenience fee
service charge
card fee
credit card fee
additional charge
extra charge
markup (customer-facing — fine in admin)
penalty
```

### Words to ALWAYS use (customer-facing):

```
Cash Price
Card Price
Pay Cash
Pay Card
```

### Words fine for ADMIN ONLY (never customer-facing):

```
dual pricing rate
dual pricing amount
dual pricing earned
dual pricing collected
effective rate
processing cost
net benefit
surcharge rate (in settings config only — labeled "Dual Pricing Rate")
```

### Settings Screen Labels:

The settings page where the shop owner configures their rate should say:

```
Dual Pricing Rate: [3.49] %

This is the difference between your cash price and card price.
The card price is automatically calculated as:
Cash Price + (Cash Price × Rate) = Card Price
```

NOT:
- ~~"Surcharge Rate"~~
- ~~"Card Fee Percentage"~~
- ~~"Processing Fee Rate"~~

---

## 8. Updates to Existing Prototypes

The dual pricing payment prototype (pcb_auto_dual_pricing_payment.jsx) needs these changes:

### 8.1 Remove from Invoice Tab:
- Remove any line showing "Surcharge" or "Card Fee" as a line item
- Remove the "Surcharge: $19.18" line between tax and total
- Replace with simple dual pricing box showing Cash Price and Card Price

### 8.2 Update Payment Tab:
- Payment buttons should show: "💵 Cash — $549.64" and "💳 Card — $568.82"
- Remove any text that says "includes X% surcharge" or "surcharge of $X"
- After selecting card, the total shown is just the card price — no breakdown

### 8.3 Update Receipt Tab:
- Remove any "Surcharge" line item
- Show only: line items → subtotal → tax → amount paid
- The amount paid is simply the cash price or the card price (whichever they chose)

### 8.4 Rename Settings Tab:
- Change "Surcharge Rate" to "Dual Pricing Rate"
- Change any mention of "surcharge" to "dual pricing"
- Keep the rate configuration (3.49%, slider, presets) — just rename labels

---

## 9. Email Invoice & Receipt Updates

Update the Resend email templates (from PCB_Auto_Resend_Email_Integration.md):

### Invoice email:
- Show dual pricing box with Cash Price / Card Price
- NO surcharge line item in the email body or PDF attachment

### Receipt email:
- Show what was paid (one amount)
- Show payment method
- NO surcharge line item
- NO "your card price included a X% surcharge"

---

## 10. Database Migration Note

If the existing database has a column called `surcharge_amount` or `surcharge_rate`, rename them:

```sql
ALTER TABLE payments RENAME COLUMN surcharge_amount TO dual_pricing_amount;
ALTER TABLE payments RENAME COLUMN surcharge_rate TO dual_pricing_rate;
ALTER TABLE shop_settings RENAME COLUMN surcharge_rate TO dual_pricing_rate;
```

The data stays the same — it's the same math. We're just using correct terminology everywhere.

---

## 11. Summary — The One Rule

**The customer sees two prices. They pick one. That's it.**

Everything else — the rate, the math, the tracking, the reporting — lives behind the admin wall where only the shop owner and their staff can see it.

This is not cosmetic. This is the legal difference between a dual pricing program (legal everywhere) and a surcharging program (restricted, requires disclosures, banned in some states). PCB Auto runs a dual pricing program.
