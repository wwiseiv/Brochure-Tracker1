# REPLIT: Add Customizable Pricing to Statement Analyzer

## Current Problem

The analyzer uses hardcoded rates:
- Dual Pricing: $64.95/month, 3.99% customer fee
- Interchange Plus: IC + 0.20% + $0.10/txn

**Agents need to set their own rates** — they might have different deals or want to show different scenarios.

---

## Add This UI Section

After statement analysis completes, show a pricing configuration panel:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚙️ PRICING CONFIGURATION                                       │
│                                                                 │
│  DUAL PRICING                                                   │
│  Monthly Fee:     [$ 64.95 ]    Customer Fee:  [ 3.99 %]       │
│  [✓] Include free terminal                                     │
│                                                                 │
│  INTERCHANGE PLUS                                               │
│  Markup:  [ 0.20 %]   Per-Txn:  [$ 0.10]   Monthly:  [$ 9.95] │
│                                                                 │
│  [💾 Save as Defaults]              [🔄 Recalculate]           │
└─────────────────────────────────────────────────────────────────┘
```

---

## React Component

```jsx
function PricingConfig({ onRecalculate, defaults }) {
  const [config, setConfig] = useState({
    dpMonthlyFee: defaults?.dpMonthlyFee || 64.95,
    dpCustomerFee: defaults?.dpCustomerFee || 3.99,
    dpFreeTerminal: defaults?.dpFreeTerminal ?? true,
    icpMarkup: defaults?.icpMarkup || 0.20,
    icpPerTxn: defaults?.icpPerTxn || 0.10,
    icpMonthly: defaults?.icpMonthly || 9.95,
  });

  return (
    <div className="bg-gray-50 rounded-lg p-4 mt-4">
      <h3 className="font-semibold mb-3">⚙️ Pricing Configuration</h3>
      
      {/* Dual Pricing */}
      <div className="bg-white p-3 rounded mb-3 border-l-4 border-green-500">
        <div className="font-medium text-green-700 mb-2">Dual Pricing</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-gray-600">Monthly Fee</span>
            <div className="flex items-center">
              <span className="text-gray-500 mr-1">$</span>
              <input
                type="number"
                step="0.01"
                value={config.dpMonthlyFee}
                onChange={(e) => setConfig({...config, dpMonthlyFee: parseFloat(e.target.value)})}
                className="border rounded px-2 py-1 w-24"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Customer Card Fee</span>
            <div className="flex items-center">
              <input
                type="number"
                step="0.01"
                value={config.dpCustomerFee}
                onChange={(e) => setConfig({...config, dpCustomerFee: parseFloat(e.target.value)})}
                className="border rounded px-2 py-1 w-20"
              />
              <span className="text-gray-500 ml-1">%</span>
            </div>
          </label>
        </div>
        <label className="flex items-center gap-2 mt-2 text-sm">
          <input
            type="checkbox"
            checked={config.dpFreeTerminal}
            onChange={(e) => setConfig({...config, dpFreeTerminal: e.target.checked})}
          />
          Include free terminal
        </label>
      </div>
      
      {/* Interchange Plus */}
      <div className="bg-white p-3 rounded mb-3">
        <div className="font-medium text-gray-700 mb-2">Interchange Plus</div>
        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="text-sm text-gray-600">Markup</span>
            <div className="flex items-center">
              <input
                type="number"
                step="0.01"
                value={config.icpMarkup}
                onChange={(e) => setConfig({...config, icpMarkup: parseFloat(e.target.value)})}
                className="border rounded px-2 py-1 w-16"
              />
              <span className="text-gray-500 ml-1">%</span>
            </div>
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Per Transaction</span>
            <div className="flex items-center">
              <span className="text-gray-500 mr-1">$</span>
              <input
                type="number"
                step="0.01"
                value={config.icpPerTxn}
                onChange={(e) => setConfig({...config, icpPerTxn: parseFloat(e.target.value)})}
                className="border rounded px-2 py-1 w-16"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Monthly Fee</span>
            <div className="flex items-center">
              <span className="text-gray-500 mr-1">$</span>
              <input
                type="number"
                step="0.01"
                value={config.icpMonthly}
                onChange={(e) => setConfig({...config, icpMonthly: parseFloat(e.target.value)})}
                className="border rounded px-2 py-1 w-16"
              />
            </div>
          </label>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex justify-between">
        <button 
          onClick={() => saveDefaults(config)}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          💾 Save as Defaults
        </button>
        <button 
          onClick={() => onRecalculate(config)}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          🔄 Recalculate Savings
        </button>
      </div>
    </div>
  );
}
```

---

## Updated Calculation Function

Replace the hardcoded values with the config:

```javascript
function calculateSavings(statementData, config) {
  const { totalVolume, totalTransactions, totalFees } = statementData;
  
  // Estimate true interchange cost (~1.5% average)
  const trueInterchange = totalVolume * 0.015;
  const assessments = totalVolume * 0.0013;
  const trueCost = trueInterchange + assessments;
  
  // DUAL PRICING - use config values
  const dpMonthlyCost = config.dpMonthlyFee;  // Was hardcoded 64.95
  const dpEffectiveRate = (dpMonthlyCost / totalVolume) * 100;
  const dpMonthlySavings = totalFees - dpMonthlyCost;
  const dpAnnualSavings = dpMonthlySavings * 12;
  
  // INTERCHANGE PLUS - use config values
  const icpMarkup = totalVolume * (config.icpMarkup / 100);  // Was hardcoded 0.20%
  const icpTxnFees = totalTransactions * config.icpPerTxn;   // Was hardcoded $0.10
  const icpMonthlyCost = trueCost + icpMarkup + icpTxnFees + config.icpMonthly;
  const icpEffectiveRate = (icpMonthlyCost / totalVolume) * 100;
  const icpMonthlySavings = totalFees - icpMonthlyCost;
  const icpAnnualSavings = icpMonthlySavings * 12;
  
  return {
    dualPricing: {
      monthlyCost: dpMonthlyCost.toFixed(2),
      effectiveRate: dpEffectiveRate.toFixed(2),
      monthlySavings: dpMonthlySavings.toFixed(2),
      annualSavings: dpAnnualSavings.toFixed(2),
      customerFee: config.dpCustomerFee  // Show what rate was used
    },
    interchangePlus: {
      monthlyCost: icpMonthlyCost.toFixed(2),
      effectiveRate: icpEffectiveRate.toFixed(2),
      monthlySavings: icpMonthlySavings.toFixed(2),
      annualSavings: icpAnnualSavings.toFixed(2),
      markup: config.icpMarkup,
      perTxn: config.icpPerTxn
    },
    maxAnnualSavings: Math.max(dpAnnualSavings, icpAnnualSavings).toFixed(2)
  };
}
```

---

## Store Agent Defaults

```javascript
// Save defaults to localStorage (simple) or database (better)
function saveDefaults(config) {
  localStorage.setItem('agentPricingDefaults', JSON.stringify(config));
}

function loadDefaults() {
  const saved = localStorage.getItem('agentPricingDefaults');
  return saved ? JSON.parse(saved) : {
    dpMonthlyFee: 64.95,
    dpCustomerFee: 3.99,
    dpFreeTerminal: true,
    icpMarkup: 0.20,
    icpPerTxn: 0.10,
    icpMonthly: 9.95
  };
}
```

---

## Quick Presets (Optional)

Add dropdown for common scenarios:

```jsx
const PRESETS = {
  standard: { dpMonthlyFee: 64.95, dpCustomerFee: 3.99, icpMarkup: 0.20, icpPerTxn: 0.10 },
  aggressive: { dpMonthlyFee: 49.95, dpCustomerFee: 3.49, icpMarkup: 0.15, icpPerTxn: 0.08 },
  premium: { dpMonthlyFee: 39.95, dpCustomerFee: 3.49, icpMarkup: 0.10, icpPerTxn: 0.05 },
};

<select onChange={(e) => setConfig({...config, ...PRESETS[e.target.value]})}>
  <option value="">Custom</option>
  <option value="standard">PCBancard Standard</option>
  <option value="aggressive">Aggressive</option>
  <option value="premium">Premium/High Volume</option>
</select>
```

---

## Display Config Used in Results

Show which pricing was used so the agent knows:

```jsx
<div className="text-xs text-gray-500 mt-2">
  Pricing: ${config.dpMonthlyFee}/mo fee, {config.dpCustomerFee}% customer fee
</div>
```

---

## Summary

| What | Before | After |
|------|--------|-------|
| DP Monthly Fee | Hardcoded $64.95 | Agent sets ($39.95 - $99.95) |
| DP Customer Fee | Hardcoded 3.99% | Agent sets (3.49% - 4.00%) |
| IC+ Markup | Hardcoded 0.20% | Agent sets (0.10% - 0.30%) |
| IC+ Per-Txn | Hardcoded $0.10 | Agent sets ($0.05 - $0.15) |
| Defaults | None | Saved per agent |

This lets each agent configure their actual deal structure for accurate comparisons.
