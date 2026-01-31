# Agent Pricing Settings — Customizable Rate Configuration

## The Problem

Currently, the analyzer uses hardcoded values:
- Dual Pricing: $64.95/month flat fee
- Dual Pricing Customer Fee: 3.99%
- Interchange Plus: IC + 0.20% + $0.10/txn

But agents need to:
1. Set their own Dual Pricing monthly fee (might be $49.95, $64.95, $74.95, etc.)
2. Set their own Dual Pricing customer fee (3.49%, 3.99%, 4.00%, etc.)
3. Set their own IC+ markup (0.15%, 0.20%, 0.25%, etc.)
4. Set per-transaction fees
5. Save defaults but override per-analysis

---

## Solution: Agent Pricing Profile + Per-Analysis Override

### UI Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 Statement Analysis Results                                       │
│                                                                      │
│  [Extracted Data Section - as it exists now]                        │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ⚙️ PRICING CONFIGURATION                      [Use My Defaults ▼]  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  DUAL PRICING                                                │   │
│  │                                                              │   │
│  │  Monthly Fee        [$ 64.95    ]                           │   │
│  │  Customer Card Fee  [  3.99    %]                           │   │
│  │  Include Equipment  [✓] Free terminal program               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  INTERCHANGE PLUS                                            │   │
│  │                                                              │   │
│  │  Markup Rate        [  0.20    %]                           │   │
│  │  Per-Transaction    [$ 0.10     ]                           │   │
│  │  Monthly Fee        [$ 9.95     ]  (gateway, statement)     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  FLAT RATE (Optional)                                        │   │
│  │                                                              │   │
│  │  Rate               [  2.75    %]                           │   │
│  │  Per-Transaction    [$ 0.00     ]                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  [💾 Save as My Defaults]          [🔄 Recalculate Savings]        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Agent Pricing Profiles

```sql
CREATE TABLE agent_pricing_profiles (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES agents(id),
  profile_name VARCHAR(100) DEFAULT 'Default',
  is_default BOOLEAN DEFAULT false,
  
  -- Dual Pricing Settings
  dp_monthly_fee DECIMAL(10,2) DEFAULT 64.95,
  dp_customer_fee_percent DECIMAL(5,4) DEFAULT 3.99,
  dp_include_equipment BOOLEAN DEFAULT true,
  dp_equipment_cost DECIMAL(10,2) DEFAULT 0.00,
  
  -- Interchange Plus Settings
  icp_markup_percent DECIMAL(5,4) DEFAULT 0.20,
  icp_per_transaction DECIMAL(10,4) DEFAULT 0.10,
  icp_monthly_fee DECIMAL(10,2) DEFAULT 9.95,
  icp_pci_fee DECIMAL(10,2) DEFAULT 0.00,
  
  -- Flat Rate Settings (optional comparison)
  flat_rate_enabled BOOLEAN DEFAULT false,
  flat_rate_percent DECIMAL(5,4) DEFAULT 2.75,
  flat_rate_per_transaction DECIMAL(10,4) DEFAULT 0.00,
  flat_rate_monthly_fee DECIMAL(10,2) DEFAULT 0.00,
  
  -- Tiered Rate Settings (optional)
  tiered_enabled BOOLEAN DEFAULT false,
  tiered_qualified DECIMAL(5,4) DEFAULT 1.69,
  tiered_mid_qualified DECIMAL(5,4) DEFAULT 2.19,
  tiered_non_qualified DECIMAL(5,4) DEFAULT 2.99,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX idx_agent_default_profile ON agent_pricing_profiles(agent_id, is_default);
```

---

## Updated Calculation Functions

```javascript
/**
 * Calculate savings with customizable pricing
 */
function calculateSavings(statementData, pricingConfig) {
  const {
    totalVolume,
    totalTransactions,
    totalFees,
    effectiveRate,
    interchange  // If we can extract true IC from statement
  } = statementData;
  
  const {
    // Dual Pricing
    dpMonthlyFee = 64.95,
    dpCustomerFeePercent = 3.99,
    dpIncludeEquipment = true,
    dpEquipmentCost = 0,
    
    // Interchange Plus
    icpMarkupPercent = 0.20,
    icpPerTransaction = 0.10,
    icpMonthlyFee = 9.95,
    icpPciFee = 0,
    
    // Flat Rate (optional)
    flatRateEnabled = false,
    flatRatePercent = 2.75,
    flatRatePerTransaction = 0,
    flatRateMonthlyFee = 0
  } = pricingConfig;
  
  // Estimate interchange if not provided (~1.5-1.6% average)
  const estimatedInterchange = interchange || (totalVolume * 0.0155);
  const estimatedAssessments = totalVolume * 0.0013; // ~0.13% average
  const trueCost = estimatedInterchange + estimatedAssessments;
  
  // ===== DUAL PRICING CALCULATION =====
  const dpMonthlyCost = dpMonthlyFee + (dpIncludeEquipment ? 0 : dpEquipmentCost);
  const dpEffectiveRate = (dpMonthlyCost / totalVolume) * 100;
  const dpMonthlySavings = totalFees - dpMonthlyCost;
  const dpAnnualSavings = dpMonthlySavings * 12;
  
  // ===== INTERCHANGE PLUS CALCULATION =====
  const icpMarkup = totalVolume * (icpMarkupPercent / 100);
  const icpTransactionFees = totalTransactions * icpPerTransaction;
  const icpMonthlyCost = trueCost + icpMarkup + icpTransactionFees + icpMonthlyFee + icpPciFee;
  const icpEffectiveRate = (icpMonthlyCost / totalVolume) * 100;
  const icpMonthlySavings = totalFees - icpMonthlyCost;
  const icpAnnualSavings = icpMonthlySavings * 12;
  
  // ===== FLAT RATE CALCULATION (if enabled) =====
  let flatRateResult = null;
  if (flatRateEnabled) {
    const flatMonthlyCost = (totalVolume * (flatRatePercent / 100)) + 
                           (totalTransactions * flatRatePerTransaction) + 
                           flatRateMonthlyFee;
    const flatEffectiveRate = flatRatePercent;
    const flatMonthlySavings = totalFees - flatMonthlyCost;
    const flatAnnualSavings = flatMonthlySavings * 12;
    
    flatRateResult = {
      monthlyCost: flatMonthlyCost.toFixed(2),
      effectiveRate: flatEffectiveRate.toFixed(2),
      monthlySavings: flatMonthlySavings.toFixed(2),
      annualSavings: flatAnnualSavings.toFixed(2)
    };
  }
  
  return {
    // Current state
    current: {
      volume: totalVolume,
      transactions: totalTransactions,
      fees: totalFees,
      effectiveRate: effectiveRate,
      estimatedInterchange: estimatedInterchange.toFixed(2),
      estimatedAssessments: estimatedAssessments.toFixed(2),
      trueCost: trueCost.toFixed(2),
      processorMarkup: (totalFees - trueCost).toFixed(2),
      processorMarkupPercent: (((totalFees - trueCost) / totalVolume) * 100).toFixed(2)
    },
    
    // Dual Pricing
    dualPricing: {
      monthlyCost: dpMonthlyCost.toFixed(2),
      effectiveRate: dpEffectiveRate.toFixed(2),
      monthlySavings: dpMonthlySavings.toFixed(2),
      annualSavings: dpAnnualSavings.toFixed(2),
      // Config used (for display)
      config: {
        monthlyFee: dpMonthlyFee,
        customerFee: dpCustomerFeePercent,
        includesEquipment: dpIncludeEquipment
      }
    },
    
    // Interchange Plus
    interchangePlus: {
      monthlyCost: icpMonthlyCost.toFixed(2),
      effectiveRate: icpEffectiveRate.toFixed(2),
      monthlySavings: icpMonthlySavings.toFixed(2),
      annualSavings: icpAnnualSavings.toFixed(2),
      // Breakdown
      breakdown: {
        interchange: estimatedInterchange.toFixed(2),
        assessments: estimatedAssessments.toFixed(2),
        markup: icpMarkup.toFixed(2),
        transactionFees: icpTransactionFees.toFixed(2),
        monthlyFees: (icpMonthlyFee + icpPciFee).toFixed(2)
      },
      // Config used
      config: {
        markupPercent: icpMarkupPercent,
        perTransaction: icpPerTransaction,
        monthlyFee: icpMonthlyFee
      }
    },
    
    // Flat Rate (if enabled)
    flatRate: flatRateResult,
    
    // Recommendation
    recommended: dpMonthlySavings > icpMonthlySavings ? 'dualPricing' : 'interchangePlus',
    maxSavings: Math.max(dpMonthlySavings, icpMonthlySavings).toFixed(2),
    maxAnnualSavings: (Math.max(dpMonthlySavings, icpMonthlySavings) * 12).toFixed(2)
  };
}
```

---

## React Component: Pricing Configuration

```jsx
import { useState, useEffect } from 'react';

function PricingConfiguration({ onConfigChange, defaultConfig }) {
  const [config, setConfig] = useState({
    // Dual Pricing
    dpMonthlyFee: 64.95,
    dpCustomerFeePercent: 3.99,
    dpIncludeEquipment: true,
    
    // Interchange Plus
    icpMarkupPercent: 0.20,
    icpPerTransaction: 0.10,
    icpMonthlyFee: 9.95,
    
    // Flat Rate
    flatRateEnabled: false,
    flatRatePercent: 2.75,
    
    ...defaultConfig
  });
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const handleChange = (field, value) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
  };
  
  const handleRecalculate = () => {
    onConfigChange(config);
  };
  
  const handleSaveDefaults = async () => {
    await fetch('/api/agent/pricing-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    alert('Defaults saved!');
  };
  
  return (
    <div className="pricing-config bg-gray-50 rounded-lg p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>⚙️</span> Pricing Configuration
        </h3>
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          {showAdvanced ? 'Simple View' : 'Advanced Options'}
        </button>
      </div>
      
      {/* Dual Pricing Section */}
      <div className="bg-white rounded-lg p-4 mb-4 border-2 border-green-200">
        <h4 className="font-medium text-green-700 mb-3">Dual Pricing</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Monthly Fee</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                value={config.dpMonthlyFee}
                onChange={(e) => handleChange('dpMonthlyFee', parseFloat(e.target.value))}
                className="w-full pl-7 pr-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Customer Card Fee</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={config.dpCustomerFeePercent}
                onChange={(e) => handleChange('dpCustomerFeePercent', parseFloat(e.target.value))}
                className="w-full pl-3 pr-7 py-2 border rounded-lg"
              />
              <span className="absolute right-3 top-2 text-gray-500">%</span>
            </div>
          </div>
        </div>
        
        <div className="mt-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.dpIncludeEquipment}
              onChange={(e) => handleChange('dpIncludeEquipment', e.target.checked)}
              className="rounded"
            />
            <span>Include free terminal (Dejavoo P1/P3)</span>
          </label>
        </div>
      </div>
      
      {/* Interchange Plus Section */}
      <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-3">Interchange Plus</h4>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Markup Rate</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={config.icpMarkupPercent}
                onChange={(e) => handleChange('icpMarkupPercent', parseFloat(e.target.value))}
                className="w-full pl-3 pr-7 py-2 border rounded-lg"
              />
              <span className="absolute right-3 top-2 text-gray-500">%</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Per Transaction</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                value={config.icpPerTransaction}
                onChange={(e) => handleChange('icpPerTransaction', parseFloat(e.target.value))}
                className="w-full pl-7 pr-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Monthly Fee</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                value={config.icpMonthlyFee}
                onChange={(e) => handleChange('icpMonthlyFee', parseFloat(e.target.value))}
                className="w-full pl-7 pr-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Advanced: Flat Rate Comparison */}
      {showAdvanced && (
        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={config.flatRateEnabled}
              onChange={(e) => handleChange('flatRateEnabled', e.target.checked)}
              className="rounded"
            />
            <h4 className="font-medium text-gray-700">Flat Rate Comparison</h4>
          </div>
          
          {config.flatRateEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Flat Rate</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={config.flatRatePercent}
                    onChange={(e) => handleChange('flatRatePercent', parseFloat(e.target.value))}
                    className="w-full pl-3 pr-7 py-2 border rounded-lg"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">%</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Monthly Fee</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={config.flatRateMonthlyFee}
                    onChange={(e) => handleChange('flatRateMonthlyFee', parseFloat(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex justify-between mt-4">
        <button
          onClick={handleSaveDefaults}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
        >
          <span>💾</span> Save as My Defaults
        </button>
        
        <button
          onClick={handleRecalculate}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <span>🔄</span> Recalculate Savings
        </button>
      </div>
    </div>
  );
}

export default PricingConfiguration;
```

---

## API Endpoints

```javascript
// Get agent's default pricing profile
app.get('/api/agent/pricing-profile', authenticate, async (req, res) => {
  const result = await db.query(`
    SELECT * FROM agent_pricing_profiles
    WHERE agent_id = $1 AND is_default = true
  `, [req.user.id]);
  
  if (result.rows.length === 0) {
    // Return system defaults
    return res.json({
      dpMonthlyFee: 64.95,
      dpCustomerFeePercent: 3.99,
      dpIncludeEquipment: true,
      icpMarkupPercent: 0.20,
      icpPerTransaction: 0.10,
      icpMonthlyFee: 9.95,
      flatRateEnabled: false
    });
  }
  
  res.json(result.rows[0]);
});

// Save agent's default pricing profile
app.post('/api/agent/pricing-profile', authenticate, async (req, res) => {
  const config = req.body;
  
  // Upsert the default profile
  await db.query(`
    INSERT INTO agent_pricing_profiles (
      agent_id, is_default,
      dp_monthly_fee, dp_customer_fee_percent, dp_include_equipment,
      icp_markup_percent, icp_per_transaction, icp_monthly_fee,
      flat_rate_enabled, flat_rate_percent, flat_rate_monthly_fee
    ) VALUES ($1, true, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (agent_id, is_default) WHERE is_default = true
    DO UPDATE SET
      dp_monthly_fee = $2,
      dp_customer_fee_percent = $3,
      dp_include_equipment = $4,
      icp_markup_percent = $5,
      icp_per_transaction = $6,
      icp_monthly_fee = $7,
      flat_rate_enabled = $8,
      flat_rate_percent = $9,
      flat_rate_monthly_fee = $10,
      updated_at = NOW()
  `, [
    req.user.id,
    config.dpMonthlyFee,
    config.dpCustomerFeePercent,
    config.dpIncludeEquipment,
    config.icpMarkupPercent,
    config.icpPerTransaction,
    config.icpMonthlyFee,
    config.flatRateEnabled,
    config.flatRatePercent,
    config.flatRateMonthlyFee
  ]);
  
  res.json({ success: true });
});

// Calculate savings with custom config
app.post('/api/calculate-savings', async (req, res) => {
  const { statementData, pricingConfig } = req.body;
  
  const results = calculateSavings(statementData, pricingConfig);
  
  res.json(results);
});
```

---

## Preset Configurations

Add quick-select presets for common scenarios:

```jsx
const PRICING_PRESETS = {
  'pcbancard-standard': {
    name: 'PCBancard Standard',
    dpMonthlyFee: 64.95,
    dpCustomerFeePercent: 3.99,
    icpMarkupPercent: 0.20,
    icpPerTransaction: 0.10
  },
  'pcbancard-premium': {
    name: 'PCBancard Premium',
    dpMonthlyFee: 49.95,
    dpCustomerFeePercent: 3.49,
    icpMarkupPercent: 0.15,
    icpPerTransaction: 0.08
  },
  'aggressive': {
    name: 'Aggressive (Low Margin)',
    dpMonthlyFee: 39.95,
    dpCustomerFeePercent: 3.49,
    icpMarkupPercent: 0.10,
    icpPerTransaction: 0.05
  },
  'high-volume': {
    name: 'High Volume Merchant',
    dpMonthlyFee: 99.95,
    dpCustomerFeePercent: 3.99,
    icpMarkupPercent: 0.08,
    icpPerTransaction: 0.03
  }
};

// Dropdown to select preset
<select onChange={(e) => applyPreset(e.target.value)}>
  <option value="">Custom</option>
  {Object.entries(PRICING_PRESETS).map(([key, preset]) => (
    <option key={key} value={key}>{preset.name}</option>
  ))}
</select>
```

---

## Updated Results Display

Show which pricing config was used:

```jsx
function SavingsResults({ results }) {
  return (
    <div className="results">
      {/* Dual Pricing Card */}
      <div className="bg-green-50 border-2 border-green-400 rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">RECOMMENDED</span>
            <h3 className="text-xl font-bold mt-2">Dual Pricing</h3>
            <p className="text-sm text-gray-600">
              Customer pays {results.dualPricing.config.customerFee}% card fee
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-600">
              ${results.dualPricing.annualSavings}
            </div>
            <div className="text-sm text-gray-500">annual savings</div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div>
            <div className="text-sm text-gray-500">Monthly Cost</div>
            <div className="font-semibold">${results.dualPricing.monthlyCost}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Effective Rate</div>
            <div className="font-semibold">{results.dualPricing.effectiveRate}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Monthly Savings</div>
            <div className="font-semibold text-green-600">${results.dualPricing.monthlySavings}</div>
          </div>
        </div>
        
        {/* Config Used */}
        <div className="mt-4 pt-4 border-t text-xs text-gray-500">
          Config: ${results.dualPricing.config.monthlyFee}/mo fee, 
          {results.dualPricing.config.customerFee}% customer fee
          {results.dualPricing.config.includesEquipment && ', free terminal'}
        </div>
      </div>
      
      {/* Similar for IC+ */}
    </div>
  );
}
```

---

## Summary

| Feature | Description |
|---------|-------------|
| **Per-Analysis Override** | Change rates on any analysis |
| **Agent Defaults** | Save your standard pricing |
| **Presets** | Quick select common configs |
| **Dual Pricing Config** | Monthly fee, customer %, equipment |
| **IC+ Config** | Markup %, per-txn fee, monthly fee |
| **Flat Rate** | Optional comparison option |
| **Show Config Used** | Display what rates were used in results |

This makes BrochureTracker work for any agent's deal structure, not just one hardcoded pricing model.
