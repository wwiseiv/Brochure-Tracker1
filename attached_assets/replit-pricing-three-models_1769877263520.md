# REPLIT: Agent Pricing Configuration (Corrected)

## Three Pricing Models (Pick ONE)

The merchant chooses ONE pricing model. The agent configures the rates for that model plus any additional fees.

```
┌─────────────────────────────────────────────────────────────────────┐
│  SELECT PRICING MODEL                                                │
│                                                                      │
│  ○ Cost Plus (Interchange Plus)                                     │
│    True interchange + markup % + per-transaction fee                │
│                                                                      │
│  ○ Surcharge                                                        │
│    Flat rate up to 3% (debit cards cannot be surcharged)           │
│                                                                      │
│  ● Dual Pricing                                        ← DEFAULT    │
│    Customer pays card fee, merchant pays flat monthly              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Model 1: Cost Plus (Interchange Plus)

```
Pricing = True Interchange + [Markup %] + [Per-Txn Fee]
```

| Field | Default | Range | Notes |
|-------|---------|-------|-------|
| Markup (basis points) | 0.60% | 0.10% - 1.00% | Agent's margin |
| Per-Transaction Fee | $0.12 | $0.05 - $0.25 | Per auth attempt |

**Example:** IC + 0.60% + $0.12/txn

---

## Model 2: Surcharge

```
Pricing = [Flat Rate %] on credit cards only
```

| Field | Default | Range | Notes |
|-------|---------|-------|-------|
| Surcharge Rate | 3.00% | 0.01% - 3.00% | **Max 3% by law** |

**Rules:**
- Cannot surcharge debit cards (PIN or signature)
- Cannot exceed 3%
- Must be disclosed to customer

---

## Model 3: Dual Pricing

```
Pricing = Customer pays [Card Fee %], Merchant pays [Monthly Fee]
```

| Field | Default | Range | Notes |
|-------|---------|-------|-------|
| Customer Card Fee | 3.99% | 3.00% - 4.00% | What cardholder pays |
| Monthly Fee | $0.00 | $0.00 - $99.95 | Optional merchant fee |

**Note:** No per-transaction fee for merchant. Monthly fee default is $0.00.

---

## Additional Fees (Apply to ANY Model)

These fees can be added to any of the three pricing models:

### Authorization Fees
| Fee | Default | Typical Range |
|-----|---------|---------------|
| Electronic Auth | $0.00 | $0.00 - $0.10 |
| Voice Auth | $0.00 | $0.00 - $1.95 |
| AVS | $0.00 | $0.00 - $0.05 |
| PIN Debit Auth | $0.00 | $0.00 - $0.25 |

### Monthly Fees
| Fee | Default | Typical Range |
|-----|---------|---------------|
| Monthly Service Fee | $0.00 | $0.00 - $25.00 |
| Statement Fee | $0.00 | $0.00 - $10.00 |
| PCI Compliance Fee | $0.00 | $0.00 - $14.95 |
| PCI Non-Compliance Fee | $0.00 | $0.00 - $39.95 |
| Monthly Minimum | $0.00 | $0.00 - $25.00 |
| Gateway Fee | $0.00 | $0.00 - $25.00 |
| Wireless Fee | $0.00 | $0.00 - $15.00 |

### Miscellaneous Fees
| Fee | Default | Typical Range |
|-----|---------|---------------|
| Batch Fee | $0.00 | $0.00 - $0.25 |
| Chargeback Fee | $25.00 | $15.00 - $35.00 |
| Retrieval Fee | $15.00 | $10.00 - $25.00 |
| ACH Reject Fee | $25.00 | $25.00 - $35.00 |
| Annual Fee | $0.00 | $0.00 - $99.00 |

---

## React Component

```jsx
import { useState, useEffect } from 'react';

const DEFAULT_CONFIG = {
  // Selected pricing model
  pricingModel: 'dual_pricing', // 'cost_plus' | 'surcharge' | 'dual_pricing'
  
  // Cost Plus settings
  costPlusMarkup: 0.60,
  costPlusPerTxn: 0.12,
  
  // Surcharge settings
  surchargeRate: 3.00,
  
  // Dual Pricing settings
  dualPricingCustomerFee: 3.99,
  dualPricingMonthlyFee: 0.00,
  
  // Authorization Fees
  authFeeElectronic: 0.00,
  authFeeVoice: 0.00,
  authFeeAVS: 0.00,
  authFeePinDebit: 0.00,
  
  // Monthly Fees
  monthlyServiceFee: 0.00,
  monthlyStatementFee: 0.00,
  monthlyPciFee: 0.00,
  monthlyPciNonCompFee: 0.00,
  monthlyMinimum: 0.00,
  monthlyGatewayFee: 0.00,
  monthlyWirelessFee: 0.00,
  
  // Miscellaneous Fees
  batchFee: 0.00,
  chargebackFee: 25.00,
  retrievalFee: 15.00,
  achRejectFee: 25.00,
  annualFee: 0.00,
};

export default function PricingConfiguration({ onConfigChange, initialConfig = {} }) {
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG, ...initialConfig });
  const [showAuthFees, setShowAuthFees] = useState(false);
  const [showMonthlyFees, setShowMonthlyFees] = useState(false);
  const [showMiscFees, setShowMiscFees] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('agentPricingDefaults');
    if (saved && Object.keys(initialConfig).length === 0) {
      setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
    }
  }, []);

  const handleChange = (field, value) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
  };

  const handleModelChange = (model) => {
    handleChange('pricingModel', model);
  };

  const handleRecalculate = () => {
    if (onConfigChange) onConfigChange(config);
  };

  const handleSaveDefaults = () => {
    localStorage.setItem('agentPricingDefaults', JSON.stringify(config));
    alert('✓ Saved as your defaults');
  };

  const InputField = ({ label, value, onChange, prefix, suffix, step = "0.01", min = "0", max }) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex items-center border rounded px-2 py-1.5 bg-white">
        {prefix && <span className="text-gray-400 mr-1">{prefix}</span>}
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full outline-none text-right"
        />
        {suffix && <span className="text-gray-400 ml-1">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        ⚙️ Pricing Configuration
      </h3>

      {/* PRICING MODEL SELECTION */}
      <div className="bg-white rounded-lg p-4 mb-4 border">
        <div className="text-sm font-medium mb-3">Select Pricing Model</div>
        
        {/* Cost Plus */}
        <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer mb-2 border-2 transition-colors ${
          config.pricingModel === 'cost_plus' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-50'
        }`}>
          <input
            type="radio"
            name="pricingModel"
            checked={config.pricingModel === 'cost_plus'}
            onChange={() => handleModelChange('cost_plus')}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium">Cost Plus (Interchange Plus)</div>
            <div className="text-sm text-gray-500">True interchange + markup % + per-transaction fee</div>
          </div>
        </label>

        {/* Surcharge */}
        <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer mb-2 border-2 transition-colors ${
          config.pricingModel === 'surcharge' ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:bg-gray-50'
        }`}>
          <input
            type="radio"
            name="pricingModel"
            checked={config.pricingModel === 'surcharge'}
            onChange={() => handleModelChange('surcharge')}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium">Surcharge</div>
            <div className="text-sm text-gray-500">Flat rate up to 3% (debit cards cannot be surcharged)</div>
          </div>
        </label>

        {/* Dual Pricing */}
        <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border-2 transition-colors ${
          config.pricingModel === 'dual_pricing' ? 'border-green-500 bg-green-50' : 'border-transparent hover:bg-gray-50'
        }`}>
          <input
            type="radio"
            name="pricingModel"
            checked={config.pricingModel === 'dual_pricing'}
            onChange={() => handleModelChange('dual_pricing')}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium flex items-center gap-2">
              Dual Pricing
              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">DEFAULT</span>
            </div>
            <div className="text-sm text-gray-500">Customer pays card fee, merchant pays flat monthly</div>
          </div>
        </label>
      </div>

      {/* MODEL-SPECIFIC SETTINGS */}
      {config.pricingModel === 'cost_plus' && (
        <div className="bg-blue-50 rounded-lg p-4 mb-4 border-l-4 border-blue-500">
          <div className="font-medium text-blue-700 mb-3">Cost Plus Settings</div>
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Markup (Basis Points)"
              value={config.costPlusMarkup}
              onChange={(v) => handleChange('costPlusMarkup', v)}
              suffix="%"
              step="0.01"
            />
            <InputField
              label="Per-Transaction Fee"
              value={config.costPlusPerTxn}
              onChange={(v) => handleChange('costPlusPerTxn', v)}
              prefix="$"
              step="0.01"
            />
          </div>
          <div className="text-xs text-blue-600 mt-3 bg-blue-100 p-2 rounded">
            Formula: True Interchange + {config.costPlusMarkup}% + ${config.costPlusPerTxn.toFixed(2)}/txn
          </div>
        </div>
      )}

      {config.pricingModel === 'surcharge' && (
        <div className="bg-orange-50 rounded-lg p-4 mb-4 border-l-4 border-orange-500">
          <div className="font-medium text-orange-700 mb-3">Surcharge Settings</div>
          <div className="w-48">
            <InputField
              label="Surcharge Rate"
              value={config.surchargeRate}
              onChange={(v) => handleChange('surchargeRate', Math.min(v, 3.00))}
              suffix="%"
              step="0.01"
              max="3.00"
            />
          </div>
          <div className="text-xs text-orange-600 mt-3 bg-orange-100 p-2 rounded">
            ⚠️ Maximum 3% by law. Debit cards cannot be surcharged.
          </div>
        </div>
      )}

      {config.pricingModel === 'dual_pricing' && (
        <div className="bg-green-50 rounded-lg p-4 mb-4 border-l-4 border-green-500">
          <div className="font-medium text-green-700 mb-3">Dual Pricing Settings</div>
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Customer Card Fee"
              value={config.dualPricingCustomerFee}
              onChange={(v) => handleChange('dualPricingCustomerFee', v)}
              suffix="%"
              step="0.01"
            />
            <InputField
              label="Monthly Fee (to Merchant)"
              value={config.dualPricingMonthlyFee}
              onChange={(v) => handleChange('dualPricingMonthlyFee', v)}
              prefix="$"
              step="0.01"
            />
          </div>
          <div className="text-xs text-green-600 mt-3 bg-green-100 p-2 rounded">
            Customer pays {config.dualPricingCustomerFee}% on card transactions. 
            Merchant pays ${config.dualPricingMonthlyFee.toFixed(2)}/month.
          </div>
        </div>
      )}

      {/* ADDITIONAL FEES SECTIONS */}
      
      {/* Authorization Fees */}
      <div className="bg-white rounded-lg mb-3 border overflow-hidden">
        <button
          onClick={() => setShowAuthFees(!showAuthFees)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <span className="font-medium text-sm">Authorization Fees</span>
          <span className="text-gray-400">{showAuthFees ? '▲' : '▼'}</span>
        </button>
        {showAuthFees && (
          <div className="p-4 border-t grid grid-cols-2 md:grid-cols-4 gap-3">
            <InputField
              label="Electronic Auth"
              value={config.authFeeElectronic}
              onChange={(v) => handleChange('authFeeElectronic', v)}
              prefix="$"
              step="0.001"
            />
            <InputField
              label="Voice Auth"
              value={config.authFeeVoice}
              onChange={(v) => handleChange('authFeeVoice', v)}
              prefix="$"
            />
            <InputField
              label="AVS"
              value={config.authFeeAVS}
              onChange={(v) => handleChange('authFeeAVS', v)}
              prefix="$"
              step="0.001"
            />
            <InputField
              label="PIN Debit Auth"
              value={config.authFeePinDebit}
              onChange={(v) => handleChange('authFeePinDebit', v)}
              prefix="$"
            />
          </div>
        )}
      </div>

      {/* Monthly Fees */}
      <div className="bg-white rounded-lg mb-3 border overflow-hidden">
        <button
          onClick={() => setShowMonthlyFees(!showMonthlyFees)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <span className="font-medium text-sm">Monthly Fees</span>
          <span className="text-gray-400">{showMonthlyFees ? '▲' : '▼'}</span>
        </button>
        {showMonthlyFees && (
          <div className="p-4 border-t grid grid-cols-2 md:grid-cols-4 gap-3">
            <InputField
              label="Service Fee"
              value={config.monthlyServiceFee}
              onChange={(v) => handleChange('monthlyServiceFee', v)}
              prefix="$"
            />
            <InputField
              label="Statement Fee"
              value={config.monthlyStatementFee}
              onChange={(v) => handleChange('monthlyStatementFee', v)}
              prefix="$"
            />
            <InputField
              label="PCI Compliance"
              value={config.monthlyPciFee}
              onChange={(v) => handleChange('monthlyPciFee', v)}
              prefix="$"
            />
            <InputField
              label="PCI Non-Compliance"
              value={config.monthlyPciNonCompFee}
              onChange={(v) => handleChange('monthlyPciNonCompFee', v)}
              prefix="$"
            />
            <InputField
              label="Monthly Minimum"
              value={config.monthlyMinimum}
              onChange={(v) => handleChange('monthlyMinimum', v)}
              prefix="$"
            />
            <InputField
              label="Gateway Fee"
              value={config.monthlyGatewayFee}
              onChange={(v) => handleChange('monthlyGatewayFee', v)}
              prefix="$"
            />
            <InputField
              label="Wireless Fee"
              value={config.monthlyWirelessFee}
              onChange={(v) => handleChange('monthlyWirelessFee', v)}
              prefix="$"
            />
          </div>
        )}
      </div>

      {/* Miscellaneous Fees */}
      <div className="bg-white rounded-lg mb-4 border overflow-hidden">
        <button
          onClick={() => setShowMiscFees(!showMiscFees)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <span className="font-medium text-sm">Miscellaneous Fees</span>
          <span className="text-gray-400">{showMiscFees ? '▲' : '▼'}</span>
        </button>
        {showMiscFees && (
          <div className="p-4 border-t grid grid-cols-2 md:grid-cols-5 gap-3">
            <InputField
              label="Batch Fee"
              value={config.batchFee}
              onChange={(v) => handleChange('batchFee', v)}
              prefix="$"
            />
            <InputField
              label="Chargeback"
              value={config.chargebackFee}
              onChange={(v) => handleChange('chargebackFee', v)}
              prefix="$"
            />
            <InputField
              label="Retrieval"
              value={config.retrievalFee}
              onChange={(v) => handleChange('retrievalFee', v)}
              prefix="$"
            />
            <InputField
              label="ACH Reject"
              value={config.achRejectFee}
              onChange={(v) => handleChange('achRejectFee', v)}
              prefix="$"
            />
            <InputField
              label="Annual Fee"
              value={config.annualFee}
              onChange={(v) => handleChange('annualFee', v)}
              prefix="$"
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-3 border-t">
        <button
          onClick={handleSaveDefaults}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
        >
          💾 Save as Defaults
        </button>
        <button
          onClick={handleRecalculate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          🔄 Recalculate Savings
        </button>
      </div>
    </div>
  );
}
```

---

## Calculation Function

```javascript
function calculateSavings(statementData, config) {
  const { totalVolume, totalTransactions, totalFees } = statementData;
  
  // Estimate true interchange (~1.55% average)
  const trueInterchange = totalVolume * 0.0155;
  const assessments = totalVolume * 0.0013;
  const trueCost = trueInterchange + assessments;
  
  // Calculate total monthly add-on fees (same for all models)
  const monthlyAddOnFees = 
    config.monthlyServiceFee +
    config.monthlyStatementFee +
    config.monthlyPciFee +
    config.monthlyGatewayFee +
    config.monthlyWirelessFee;
  
  // Calculate per-transaction add-on fees
  const perTxnAddOnFees = 
    (config.authFeeElectronic * totalTransactions) +
    (config.batchFee * 30); // ~30 batches/month
  
  let proposedCost = 0;
  let effectiveRate = 0;
  let description = '';

  // Calculate based on selected pricing model
  switch (config.pricingModel) {
    case 'cost_plus':
      const markup = totalVolume * (config.costPlusMarkup / 100);
      const txnFees = totalTransactions * config.costPlusPerTxn;
      proposedCost = trueCost + markup + txnFees + monthlyAddOnFees + perTxnAddOnFees;
      effectiveRate = (proposedCost / totalVolume) * 100;
      description = `IC + ${config.costPlusMarkup}% + $${config.costPlusPerTxn.toFixed(2)}/txn`;
      break;
      
    case 'surcharge':
      // Merchant pays true cost on debit, surcharge covers credit
      // Estimate 70% credit, 30% debit
      const creditVolume = totalVolume * 0.70;
      const debitVolume = totalVolume * 0.30;
      const debitCost = debitVolume * 0.0155; // Debit interchange
      // Surcharge covers credit processing
      proposedCost = debitCost + monthlyAddOnFees + perTxnAddOnFees;
      effectiveRate = (proposedCost / totalVolume) * 100;
      description = `${config.surchargeRate}% surcharge on credit (debit at cost)`;
      break;
      
    case 'dual_pricing':
    default:
      proposedCost = config.dualPricingMonthlyFee + monthlyAddOnFees + perTxnAddOnFees;
      effectiveRate = (proposedCost / totalVolume) * 100;
      description = `Customer pays ${config.dualPricingCustomerFee}%, merchant pays $${config.dualPricingMonthlyFee.toFixed(2)}/mo`;
      break;
  }

  const monthlySavings = totalFees - proposedCost;
  const annualSavings = monthlySavings * 12;

  return {
    current: {
      fees: totalFees.toFixed(2),
      effectiveRate: ((totalFees / totalVolume) * 100).toFixed(2),
    },
    proposed: {
      model: config.pricingModel,
      monthlyCost: proposedCost.toFixed(2),
      effectiveRate: effectiveRate.toFixed(4),
      description: description,
    },
    savings: {
      monthly: monthlySavings.toFixed(2),
      annual: annualSavings.toFixed(2),
    },
    // Additional fee summary
    fees: {
      monthlyAddOns: monthlyAddOnFees.toFixed(2),
      perTxnAddOns: perTxnAddOnFees.toFixed(2),
    }
  };
}
```

---

## Quick Presets

```javascript
const PRESETS = {
  'pcbancard-dp-standard': {
    name: 'PCBancard DP Standard',
    pricingModel: 'dual_pricing',
    dualPricingCustomerFee: 3.99,
    dualPricingMonthlyFee: 0.00,
  },
  'pcbancard-dp-reduced': {
    name: 'PCBancard DP Reduced',
    pricingModel: 'dual_pricing',
    dualPricingCustomerFee: 3.49,
    dualPricingMonthlyFee: 0.00,
  },
  'pcbancard-costplus': {
    name: 'PCBancard Cost Plus',
    pricingModel: 'cost_plus',
    costPlusMarkup: 0.60,
    costPlusPerTxn: 0.12,
  },
  'pcbancard-costplus-aggressive': {
    name: 'PCBancard Cost Plus (Aggressive)',
    pricingModel: 'cost_plus',
    costPlusMarkup: 0.20,
    costPlusPerTxn: 0.10,
  },
  'surcharge-max': {
    name: 'Surcharge (Max 3%)',
    pricingModel: 'surcharge',
    surchargeRate: 3.00,
  },
};
```

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚙️ PRICING CONFIGURATION                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SELECT PRICING MODEL                                                │
│                                                                      │
│  ○ Cost Plus (Interchange Plus)                                     │
│    True interchange + markup % + per-transaction fee                │
│                                                                      │
│  ○ Surcharge                                                        │
│    Flat rate up to 3% (debit cards cannot be surcharged)           │
│                                                                      │
│  ● Dual Pricing                                        ← DEFAULT    │
│    Customer pays card fee, merchant pays flat monthly              │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DUAL PRICING SETTINGS                          (green background)  │
│  ┌────────────────────────┬────────────────────────┐               │
│  │ Customer Card Fee      │ Monthly Fee (Merchant) │               │
│  │ [ 3.99 ] %             │ [ 0.00 ] $             │               │
│  └────────────────────────┴────────────────────────┘               │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ▼ Authorization Fees                               (collapsible)   │
│  ▼ Monthly Fees                                     (collapsible)   │
│  ▼ Miscellaneous Fees                               (collapsible)   │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [💾 Save as Defaults]                    [🔄 Recalculate Savings]  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Summary

| Model | Primary Cost | Notes |
|-------|-------------|-------|
| **Cost Plus** | IC + 0.60% + $0.12/txn | Agent sets markup & per-txn |
| **Surcharge** | 3.00% flat | Max 3%, no debit surcharge |
| **Dual Pricing** | $0.00/mo default | Customer pays 3.99%, agent sets both |

**All models can add:**
- Authorization fees
- Monthly fees  
- Miscellaneous fees

This matches how PCBancard MPAs actually work.
