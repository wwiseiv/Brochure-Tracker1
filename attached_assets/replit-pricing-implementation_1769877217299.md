# REPLIT: Add Pricing Configuration to Statement Analyzer & Proposal Generator

## Current State vs Needed

**Current (Enter Manually only):**
```
IC+ Markup: 0.50%
Per Txn Fee: $0.10
Monthly Fee: $10
DP Monthly Cost: $64.95
```

**Needed (Both Statement Analyzer AND Proposal Generator):**
```
DUAL PRICING
├── Monthly Cost: $64.95 (adjustable)
├── Customer Fee: 3.99% (adjustable) 
└── Free Terminal: ✓

INTERCHANGE PLUS
├── Markup: 0.20% (adjustable - basis points)
├── Per Transaction: $0.10 (adjustable)
├── Monthly Fee: $9.95 (adjustable)
└── Assessments: Pass-through ✓

TIERED (optional)
├── Qualified: 1.69%
├── Mid-Qual: 2.19%
└── Non-Qual: 2.99%

FLAT RATE (optional)
└── Rate: 2.75%
```

---

## Step 1: Add Pricing Config State

In both `/statement-analyzer` and `/proposal-generator`, add this state:

```javascript
const [pricingConfig, setPricingConfig] = useState({
  // Dual Pricing
  dpMonthlyCost: 64.95,
  dpCustomerFee: 3.99,
  dpEquipmentIncluded: true,
  
  // Interchange Plus
  icpMarkupPercent: 0.20,
  icpPerTransaction: 0.10,
  icpMonthlyFee: 9.95,
  
  // Optional comparisons
  tieredEnabled: false,
  tieredQualified: 1.69,
  tieredMidQual: 2.19,
  tieredNonQual: 2.99,
  
  flatRateEnabled: false,
  flatRatePercent: 2.75,
});
```

---

## Step 2: Create Pricing Configuration UI

Add this section ABOVE the results display in both pages:

```jsx
{/* Pricing Configuration Section */}
<div className="bg-gray-50 rounded-lg p-4 mb-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-semibold flex items-center gap-2">
      ⚙️ Pricing Configuration
    </h3>
    <select 
      className="text-sm border rounded px-2 py-1"
      onChange={(e) => applyPreset(e.target.value)}
    >
      <option value="">Quick Presets...</option>
      <option value="standard">PCBancard Standard</option>
      <option value="aggressive">Aggressive</option>
      <option value="highvolume">High Volume</option>
    </select>
  </div>

  {/* Dual Pricing */}
  <div className="bg-white rounded-lg p-4 mb-3 border-l-4 border-green-500">
    <div className="flex items-center justify-between mb-3">
      <span className="font-medium text-green-700">Dual Pricing Program</span>
      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">RECOMMENDED</span>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Monthly Cost</label>
        <div className="flex items-center border rounded px-2 py-1">
          <span className="text-gray-400">$</span>
          <input
            type="number"
            step="0.01"
            value={pricingConfig.dpMonthlyCost}
            onChange={(e) => setPricingConfig({...pricingConfig, dpMonthlyCost: parseFloat(e.target.value)})}
            className="w-full outline-none text-right ml-1"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Customer Card Fee</label>
        <div className="flex items-center border rounded px-2 py-1">
          <input
            type="number"
            step="0.01"
            value={pricingConfig.dpCustomerFee}
            onChange={(e) => setPricingConfig({...pricingConfig, dpCustomerFee: parseFloat(e.target.value)})}
            className="w-full outline-none text-right"
          />
          <span className="text-gray-400 ml-1">%</span>
        </div>
      </div>
      <div className="flex items-center">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pricingConfig.dpEquipmentIncluded}
            onChange={(e) => setPricingConfig({...pricingConfig, dpEquipmentIncluded: e.target.checked})}
            className="rounded"
          />
          Free terminal included
        </label>
      </div>
    </div>
  </div>

  {/* Interchange Plus */}
  <div className="bg-white rounded-lg p-4 mb-3 border-l-4 border-blue-500">
    <div className="font-medium text-blue-700 mb-3">Interchange Plus</div>
    <div className="grid grid-cols-4 gap-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Markup Rate</label>
        <div className="flex items-center border rounded px-2 py-1">
          <input
            type="number"
            step="0.01"
            value={pricingConfig.icpMarkupPercent}
            onChange={(e) => setPricingConfig({...pricingConfig, icpMarkupPercent: parseFloat(e.target.value)})}
            className="w-full outline-none text-right"
          />
          <span className="text-gray-400 ml-1">%</span>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Per Transaction</label>
        <div className="flex items-center border rounded px-2 py-1">
          <span className="text-gray-400">$</span>
          <input
            type="number"
            step="0.01"
            value={pricingConfig.icpPerTransaction}
            onChange={(e) => setPricingConfig({...pricingConfig, icpPerTransaction: parseFloat(e.target.value)})}
            className="w-full outline-none text-right ml-1"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Monthly Fee</label>
        <div className="flex items-center border rounded px-2 py-1">
          <span className="text-gray-400">$</span>
          <input
            type="number"
            step="0.01"
            value={pricingConfig.icpMonthlyFee}
            onChange={(e) => setPricingConfig({...pricingConfig, icpMonthlyFee: parseFloat(e.target.value)})}
            className="w-full outline-none text-right ml-1"
          />
        </div>
      </div>
      <div className="text-xs text-gray-500 flex items-end pb-2">
        Formula: IC + {pricingConfig.icpMarkupPercent}% + ${pricingConfig.icpPerTransaction}/txn
      </div>
    </div>
  </div>

  {/* Optional: Tiered & Flat Rate */}
  <div className="flex gap-4">
    <label className="flex items-center gap-2 text-sm text-gray-600">
      <input
        type="checkbox"
        checked={pricingConfig.tieredEnabled}
        onChange={(e) => setPricingConfig({...pricingConfig, tieredEnabled: e.target.checked})}
        className="rounded"
      />
      Show Tiered comparison
    </label>
    <label className="flex items-center gap-2 text-sm text-gray-600">
      <input
        type="checkbox"
        checked={pricingConfig.flatRateEnabled}
        onChange={(e) => setPricingConfig({...pricingConfig, flatRateEnabled: e.target.checked})}
        className="rounded"
      />
      Show Flat Rate comparison
    </label>
  </div>

  {/* Tiered config (if enabled) */}
  {pricingConfig.tieredEnabled && (
    <div className="bg-white rounded-lg p-4 mt-3 border">
      <div className="text-sm font-medium mb-3">Tiered Pricing</div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-green-600 mb-1">Qualified</label>
          <div className="flex items-center border rounded px-2 py-1">
            <input
              type="number"
              step="0.01"
              value={pricingConfig.tieredQualified}
              onChange={(e) => setPricingConfig({...pricingConfig, tieredQualified: parseFloat(e.target.value)})}
              className="w-full outline-none text-right"
            />
            <span className="text-gray-400 ml-1">%</span>
          </div>
        </div>
        <div>
          <label className="block text-xs text-yellow-600 mb-1">Mid-Qualified</label>
          <div className="flex items-center border rounded px-2 py-1">
            <input
              type="number"
              step="0.01"
              value={pricingConfig.tieredMidQual}
              onChange={(e) => setPricingConfig({...pricingConfig, tieredMidQual: parseFloat(e.target.value)})}
              className="w-full outline-none text-right"
            />
            <span className="text-gray-400 ml-1">%</span>
          </div>
        </div>
        <div>
          <label className="block text-xs text-red-600 mb-1">Non-Qualified</label>
          <div className="flex items-center border rounded px-2 py-1">
            <input
              type="number"
              step="0.01"
              value={pricingConfig.tieredNonQual}
              onChange={(e) => setPricingConfig({...pricingConfig, tieredNonQual: parseFloat(e.target.value)})}
              className="w-full outline-none text-right"
            />
            <span className="text-gray-400 ml-1">%</span>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* Flat Rate config (if enabled) */}
  {pricingConfig.flatRateEnabled && (
    <div className="bg-white rounded-lg p-4 mt-3 border">
      <div className="text-sm font-medium mb-3">Flat Rate</div>
      <div className="w-48">
        <label className="block text-xs text-gray-500 mb-1">Rate</label>
        <div className="flex items-center border rounded px-2 py-1">
          <input
            type="number"
            step="0.01"
            value={pricingConfig.flatRatePercent}
            onChange={(e) => setPricingConfig({...pricingConfig, flatRatePercent: parseFloat(e.target.value)})}
            className="w-full outline-none text-right"
          />
          <span className="text-gray-400 ml-1">%</span>
        </div>
      </div>
    </div>
  )}

  {/* Action buttons */}
  <div className="flex justify-between mt-4 pt-3 border-t">
    <button
      onClick={() => {
        localStorage.setItem('agentPricingDefaults', JSON.stringify(pricingConfig));
        alert('✓ Saved as defaults');
      }}
      className="text-sm text-gray-600 hover:text-gray-800"
    >
      💾 Save as Defaults
    </button>
    <button
      onClick={recalculateSavings}
      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
    >
      🔄 Recalculate Savings
    </button>
  </div>
</div>
```

---

## Step 3: Quick Presets Function

```javascript
function applyPreset(preset) {
  const presets = {
    'standard': {
      dpMonthlyCost: 64.95,
      dpCustomerFee: 3.99,
      icpMarkupPercent: 0.20,
      icpPerTransaction: 0.10,
      icpMonthlyFee: 9.95,
    },
    'aggressive': {
      dpMonthlyCost: 49.95,
      dpCustomerFee: 3.49,
      icpMarkupPercent: 0.15,
      icpPerTransaction: 0.08,
      icpMonthlyFee: 0,
    },
    'highvolume': {
      dpMonthlyCost: 99.95,
      dpCustomerFee: 3.99,
      icpMarkupPercent: 0.10,
      icpPerTransaction: 0.05,
      icpMonthlyFee: 0,
    },
  };
  
  if (presets[preset]) {
    setPricingConfig({...pricingConfig, ...presets[preset]});
  }
}
```

---

## Step 4: Updated Calculation Function

Replace the hardcoded calculation with this:

```javascript
function calculateSavings(statementData, config) {
  const { totalVolume, totalTransactions, totalFees } = statementData;
  
  // Estimate true interchange (~1.55% average)
  const trueInterchange = totalVolume * 0.0155;
  const assessments = totalVolume * 0.0013;
  const trueCost = trueInterchange + assessments;
  
  const results = {
    current: {
      fees: totalFees,
      effectiveRate: ((totalFees / totalVolume) * 100).toFixed(2),
      processorMarkup: (totalFees - trueCost).toFixed(2),
    },
    options: []
  };

  // DUAL PRICING
  const dpCost = config.dpMonthlyCost;
  const dpSavings = totalFees - dpCost;
  results.options.push({
    name: 'Dual Pricing',
    monthlyCost: dpCost.toFixed(2),
    effectiveRate: ((dpCost / totalVolume) * 100).toFixed(4),
    monthlySavings: dpSavings.toFixed(2),
    annualSavings: (dpSavings * 12).toFixed(2),
    description: `Customer pays ${config.dpCustomerFee}% card fee`,
    recommended: true,
  });

  // INTERCHANGE PLUS
  const icpMarkup = totalVolume * (config.icpMarkupPercent / 100);
  const icpTxnFees = totalTransactions * config.icpPerTransaction;
  const icpCost = trueCost + icpMarkup + icpTxnFees + config.icpMonthlyFee;
  const icpSavings = totalFees - icpCost;
  results.options.push({
    name: 'Interchange Plus',
    monthlyCost: icpCost.toFixed(2),
    effectiveRate: ((icpCost / totalVolume) * 100).toFixed(2),
    monthlySavings: icpSavings.toFixed(2),
    annualSavings: (icpSavings * 12).toFixed(2),
    description: `IC + ${config.icpMarkupPercent}% + $${config.icpPerTransaction}/txn`,
    recommended: false,
  });

  // TIERED (if enabled)
  if (config.tieredEnabled) {
    // Assume 70/20/10 split
    const tieredCost = 
      (totalVolume * 0.70 * (config.tieredQualified / 100)) +
      (totalVolume * 0.20 * (config.tieredMidQual / 100)) +
      (totalVolume * 0.10 * (config.tieredNonQual / 100));
    const tieredSavings = totalFees - tieredCost;
    results.options.push({
      name: 'Tiered',
      monthlyCost: tieredCost.toFixed(2),
      effectiveRate: ((tieredCost / totalVolume) * 100).toFixed(2),
      monthlySavings: tieredSavings.toFixed(2),
      annualSavings: (tieredSavings * 12).toFixed(2),
      description: `Q ${config.tieredQualified}% / MQ ${config.tieredMidQual}% / NQ ${config.tieredNonQual}%`,
      recommended: false,
    });
  }

  // FLAT RATE (if enabled)
  if (config.flatRateEnabled) {
    const flatCost = totalVolume * (config.flatRatePercent / 100);
    const flatSavings = totalFees - flatCost;
    results.options.push({
      name: 'Flat Rate',
      monthlyCost: flatCost.toFixed(2),
      effectiveRate: config.flatRatePercent.toFixed(2),
      monthlySavings: flatSavings.toFixed(2),
      annualSavings: (flatSavings * 12).toFixed(2),
      description: `${config.flatRatePercent}% flat`,
      recommended: false,
    });
  }

  // Sort by savings, mark best as recommended
  results.options.sort((a, b) => parseFloat(b.annualSavings) - parseFloat(a.annualSavings));
  results.options.forEach((opt, i) => opt.recommended = (i === 0));

  results.maxAnnualSavings = results.options[0]?.annualSavings || '0';
  
  return results;
}
```

---

## Step 5: Load Saved Defaults on Page Load

```javascript
useEffect(() => {
  const saved = localStorage.getItem('agentPricingDefaults');
  if (saved) {
    setPricingConfig(prev => ({...prev, ...JSON.parse(saved)}));
  }
}, []);
```

---

## Where to Add This

| Page | Location |
|------|----------|
| `/statement-analyzer` | After file upload, before results |
| `/proposal-generator` | At top, before merchant info form |

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 Statement Analyzer                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [Upload Statement]  or  [Enter Manually]                           │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ⚙️ PRICING CONFIGURATION                    [Quick Presets... ▼]   │
│                                                                      │
│  ┌─ DUAL PRICING ─────────────────────────────── RECOMMENDED ─────┐ │
│  │  Monthly Cost: [$64.95]  Customer Fee: [3.99%]  [✓] Free term  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌─ INTERCHANGE PLUS ─────────────────────────────────────────────┐ │
│  │  Markup: [0.20%]  Per-Txn: [$0.10]  Monthly: [$9.95]           │ │
│  │  Formula: IC + 0.20% + $0.10/txn                               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  [ ] Show Tiered comparison    [ ] Show Flat Rate comparison        │
│                                                                      │
│  [💾 Save as Defaults]                    [🔄 Recalculate Savings]  │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📊 RESULTS                                                         │
│  ...                                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

This gives agents the control they need to match their actual pricing deals with processors.
