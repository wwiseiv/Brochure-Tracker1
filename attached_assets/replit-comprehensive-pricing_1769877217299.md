# REPLIT: Comprehensive Agent Pricing Configuration

## The Problem

The current "Enter Manually" page only allows setting:
- IC+ Markup % (0.50%)
- Per Txn Fee ($0.10)
- Monthly Fee ($10)
- Dual Pricing Monthly Cost ($64.95)

But agents actually need to configure **much more** based on their processor agreements. Looking at real PCBancard and Worldpay MPAs, agents set:

| Category | Fields Needed |
|----------|---------------|
| **Dual Pricing** | Monthly cost, Customer fee %, Equipment included |
| **Interchange Plus** | Markup %, Per-txn fee, Monthly fees, Assessment handling |
| **Tiered** | Qualified %, Mid-Qual %, Non-Qual %, Per-item fees |
| **Flat Rate** | Rate %, Per-txn fee |
| **Monthly Fees** | Service fee, PCI fee, Statement fee, Minimum |
| **Transaction Fees** | Auth fee, Batch fee, AVS fee |
| **Occurrence Fees** | Chargeback, Retrieval, ACH reject |

---

## Solution: Unified Pricing Configuration Component

Create ONE pricing configuration component that works in:
1. `/statement-analyzer` — Configure BEFORE or AFTER analysis
2. `/proposal-generator` — Configure when creating proposals
3. `/coach` — Quick adjustments during sales conversations

---

## Database Schema

```sql
CREATE TABLE agent_pricing_profiles (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES agents(id),
  profile_name VARCHAR(100) DEFAULT 'Default',
  is_default BOOLEAN DEFAULT false,
  
  -- DUAL PRICING
  dp_enabled BOOLEAN DEFAULT true,
  dp_monthly_cost DECIMAL(10,2) DEFAULT 64.95,
  dp_customer_fee_percent DECIMAL(5,2) DEFAULT 3.99,
  dp_equipment_included BOOLEAN DEFAULT true,
  dp_equipment_model VARCHAR(50) DEFAULT 'Dejavoo P1',
  
  -- INTERCHANGE PLUS
  icp_enabled BOOLEAN DEFAULT true,
  icp_markup_percent DECIMAL(5,3) DEFAULT 0.20,      -- basis points as %
  icp_per_transaction DECIMAL(10,4) DEFAULT 0.10,
  icp_monthly_fee DECIMAL(10,2) DEFAULT 9.95,
  icp_assessments_pass_through BOOLEAN DEFAULT true, -- vs included
  icp_brand_fees_pass_through BOOLEAN DEFAULT true,
  
  -- TIERED (optional comparison)
  tiered_enabled BOOLEAN DEFAULT false,
  tiered_qualified_percent DECIMAL(5,3) DEFAULT 1.69,
  tiered_qualified_per_item DECIMAL(10,4) DEFAULT 0.00,
  tiered_mid_qual_percent DECIMAL(5,3) DEFAULT 2.19,
  tiered_mid_qual_per_item DECIMAL(10,4) DEFAULT 0.00,
  tiered_non_qual_percent DECIMAL(5,3) DEFAULT 2.99,
  tiered_non_qual_per_item DECIMAL(10,4) DEFAULT 0.00,
  
  -- FLAT RATE (optional comparison)
  flat_rate_enabled BOOLEAN DEFAULT false,
  flat_rate_percent DECIMAL(5,3) DEFAULT 2.75,
  flat_rate_per_transaction DECIMAL(10,4) DEFAULT 0.00,
  
  -- MONTHLY FEES
  monthly_service_fee DECIMAL(10,2) DEFAULT 0.00,
  monthly_pci_fee DECIMAL(10,2) DEFAULT 0.00,        -- We include free PCI
  monthly_statement_fee DECIMAL(10,2) DEFAULT 0.00,
  monthly_minimum DECIMAL(10,2) DEFAULT 0.00,
  monthly_gateway_fee DECIMAL(10,2) DEFAULT 0.00,
  monthly_wireless_fee DECIMAL(10,2) DEFAULT 0.00,
  
  -- TRANSACTION FEES
  auth_fee DECIMAL(10,4) DEFAULT 0.00,
  batch_fee DECIMAL(10,4) DEFAULT 0.00,
  avs_fee DECIMAL(10,4) DEFAULT 0.00,
  voice_auth_fee DECIMAL(10,4) DEFAULT 0.00,
  
  -- OCCURRENCE FEES
  chargeback_fee DECIMAL(10,2) DEFAULT 25.00,
  retrieval_fee DECIMAL(10,2) DEFAULT 15.00,
  ach_reject_fee DECIMAL(10,2) DEFAULT 25.00,
  
  -- PIN DEBIT
  pin_debit_enabled BOOLEAN DEFAULT false,
  pin_debit_percent DECIMAL(5,3) DEFAULT 0.00,
  pin_debit_per_transaction DECIMAL(10,4) DEFAULT 0.00,
  pin_debit_network_pass_through BOOLEAN DEFAULT true,
  
  -- AMEX OPTBLUE
  amex_enabled BOOLEAN DEFAULT true,
  amex_markup_percent DECIMAL(5,3) DEFAULT 0.00,     -- Usually same as V/MC
  amex_per_transaction DECIMAL(10,4) DEFAULT 0.00,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX idx_agent_pricing_default ON agent_pricing_profiles(agent_id, is_default);
```

---

## React Component: PricingConfiguration

```jsx
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Save, RefreshCw, Settings } from 'lucide-react';

const DEFAULT_PRICING = {
  // Dual Pricing
  dpEnabled: true,
  dpMonthlyCost: 64.95,
  dpCustomerFeePercent: 3.99,
  dpEquipmentIncluded: true,
  dpEquipmentModel: 'Dejavoo P1',
  
  // Interchange Plus
  icpEnabled: true,
  icpMarkupPercent: 0.20,
  icpPerTransaction: 0.10,
  icpMonthlyFee: 9.95,
  icpAssessmentsPassThrough: true,
  
  // Tiered
  tieredEnabled: false,
  tieredQualifiedPercent: 1.69,
  tieredQualifiedPerItem: 0.00,
  tieredMidQualPercent: 2.19,
  tieredMidQualPerItem: 0.00,
  tieredNonQualPercent: 2.99,
  tieredNonQualPerItem: 0.00,
  
  // Flat Rate
  flatRateEnabled: false,
  flatRatePercent: 2.75,
  flatRatePerTransaction: 0.00,
  
  // Monthly Fees
  monthlyServiceFee: 0.00,
  monthlyPciFee: 0.00,
  monthlyStatementFee: 0.00,
  monthlyMinimum: 0.00,
  
  // Transaction Fees
  authFee: 0.00,
  batchFee: 0.00,
  avsFee: 0.00,
  
  // Occurrence Fees
  chargebackFee: 25.00,
  retrievalFee: 15.00,
  achRejectFee: 25.00,
};

// Quick presets based on common scenarios
const PRICING_PRESETS = {
  'pcbancard-standard': {
    name: 'PCBancard Standard',
    dpMonthlyCost: 64.95,
    dpCustomerFeePercent: 3.99,
    icpMarkupPercent: 0.20,
    icpPerTransaction: 0.10,
    icpMonthlyFee: 9.95,
  },
  'pcbancard-aggressive': {
    name: 'PCBancard Aggressive',
    dpMonthlyCost: 49.95,
    dpCustomerFeePercent: 3.49,
    icpMarkupPercent: 0.15,
    icpPerTransaction: 0.08,
    icpMonthlyFee: 0.00,
  },
  'high-volume': {
    name: 'High Volume ($250K+)',
    dpMonthlyCost: 99.95,
    dpCustomerFeePercent: 3.99,
    icpMarkupPercent: 0.10,
    icpPerTransaction: 0.05,
    icpMonthlyFee: 0.00,
  },
  'competitive-win': {
    name: 'Competitive Win',
    dpMonthlyCost: 39.95,
    dpCustomerFeePercent: 3.49,
    icpMarkupPercent: 0.12,
    icpPerTransaction: 0.07,
    icpMonthlyFee: 0.00,
  },
};

export default function PricingConfiguration({ 
  onConfigChange, 
  initialConfig = {},
  showRecalculate = true,
  compact = false 
}) {
  const [config, setConfig] = useState({ ...DEFAULT_PRICING, ...initialConfig });
  const [expandedSections, setExpandedSections] = useState({
    dualPricing: true,
    interchangePlus: true,
    tiered: false,
    flatRate: false,
    monthlyFees: false,
    transactionFees: false,
    occurrenceFees: false,
  });
  const [selectedPreset, setSelectedPreset] = useState('');

  // Load saved defaults on mount
  useEffect(() => {
    const saved = localStorage.getItem('agentPricingDefaults');
    if (saved && Object.keys(initialConfig).length === 0) {
      setConfig({ ...DEFAULT_PRICING, ...JSON.parse(saved) });
    }
  }, []);

  const handleChange = (field, value) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    // Auto-recalculate on change if handler provided
    if (onConfigChange && !showRecalculate) {
      onConfigChange(newConfig);
    }
  };

  const handlePresetChange = (presetKey) => {
    setSelectedPreset(presetKey);
    if (presetKey && PRICING_PRESETS[presetKey]) {
      const newConfig = { ...config, ...PRICING_PRESETS[presetKey] };
      setConfig(newConfig);
    }
  };

  const handleRecalculate = () => {
    if (onConfigChange) {
      onConfigChange(config);
    }
  };

  const handleSaveDefaults = () => {
    localStorage.setItem('agentPricingDefaults', JSON.stringify(config));
    // Also save to server if logged in
    fetch('/api/agent/pricing-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    }).catch(() => {}); // Silent fail for non-logged-in users
    alert('✓ Saved as your defaults');
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const SectionHeader = ({ title, section, enabled, onToggleEnabled }) => (
    <div 
      className="flex items-center justify-between cursor-pointer py-2"
      onClick={() => toggleSection(section)}
    >
      <div className="flex items-center gap-2">
        {onToggleEnabled && (
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              e.stopPropagation();
              onToggleEnabled(e.target.checked);
            }}
            className="rounded"
          />
        )}
        <span className="font-medium">{title}</span>
      </div>
      {expandedSections[section] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </div>
  );

  const InputField = ({ label, value, onChange, prefix, suffix, step = "0.01", min = "0" }) => (
    <div className="flex flex-col">
      <label className="text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex items-center border rounded px-2 py-1 bg-white">
        {prefix && <span className="text-gray-400 mr-1">{prefix}</span>}
        <input
          type="number"
          step={step}
          min={min}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full outline-none text-right"
        />
        {suffix && <span className="text-gray-400 ml-1">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className={`bg-gray-50 rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
      {/* Header with Presets */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-gray-500" />
          <span className="font-semibold">Pricing Configuration</span>
        </div>
        <select
          value={selectedPreset}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="">Quick Presets...</option>
          {Object.entries(PRICING_PRESETS).map(([key, preset]) => (
            <option key={key} value={key}>{preset.name}</option>
          ))}
        </select>
      </div>

      {/* DUAL PRICING */}
      <div className="bg-white rounded-lg mb-3 border-l-4 border-green-500 overflow-hidden">
        <div className="px-3 bg-green-50">
          <SectionHeader 
            title="Dual Pricing Program" 
            section="dualPricing"
            enabled={config.dpEnabled}
            onToggleEnabled={(v) => handleChange('dpEnabled', v)}
          />
        </div>
        {expandedSections.dualPricing && config.dpEnabled && (
          <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <InputField
              label="Monthly Cost"
              value={config.dpMonthlyCost}
              onChange={(v) => handleChange('dpMonthlyCost', v)}
              prefix="$"
            />
            <InputField
              label="Customer Card Fee"
              value={config.dpCustomerFeePercent}
              onChange={(v) => handleChange('dpCustomerFeePercent', v)}
              suffix="%"
            />
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.dpEquipmentIncluded}
                onChange={(e) => handleChange('dpEquipmentIncluded', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Free terminal included ({config.dpEquipmentModel})</span>
            </div>
          </div>
        )}
      </div>

      {/* INTERCHANGE PLUS */}
      <div className="bg-white rounded-lg mb-3 border-l-4 border-blue-500 overflow-hidden">
        <div className="px-3 bg-blue-50">
          <SectionHeader 
            title="Interchange Plus" 
            section="interchangePlus"
            enabled={config.icpEnabled}
            onToggleEnabled={(v) => handleChange('icpEnabled', v)}
          />
        </div>
        {expandedSections.interchangePlus && config.icpEnabled && (
          <div className="p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <InputField
                label="Markup Rate"
                value={config.icpMarkupPercent}
                onChange={(v) => handleChange('icpMarkupPercent', v)}
                suffix="%"
                step="0.01"
              />
              <InputField
                label="Per Transaction"
                value={config.icpPerTransaction}
                onChange={(v) => handleChange('icpPerTransaction', v)}
                prefix="$"
                step="0.01"
              />
              <InputField
                label="Monthly Fee"
                value={config.icpMonthlyFee}
                onChange={(v) => handleChange('icpMonthlyFee', v)}
                prefix="$"
              />
              <div className="flex items-center">
                <label className="text-xs text-gray-500 flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={config.icpAssessmentsPassThrough}
                    onChange={(e) => handleChange('icpAssessmentsPassThrough', e.target.checked)}
                    className="rounded"
                  />
                  Pass-through assessments
                </label>
              </div>
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              Formula: True Interchange + {config.icpMarkupPercent}% + ${config.icpPerTransaction}/txn + ${config.icpMonthlyFee}/mo
            </div>
          </div>
        )}
      </div>

      {/* TIERED (collapsed by default) */}
      <div className="bg-white rounded-lg mb-3 border overflow-hidden">
        <div className="px-3">
          <SectionHeader 
            title="Tiered Pricing (Optional Comparison)" 
            section="tiered"
            enabled={config.tieredEnabled}
            onToggleEnabled={(v) => handleChange('tieredEnabled', v)}
          />
        </div>
        {expandedSections.tiered && config.tieredEnabled && (
          <div className="p-3 grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs font-medium text-green-600 mb-2">Qualified</div>
              <InputField
                label="Rate"
                value={config.tieredQualifiedPercent}
                onChange={(v) => handleChange('tieredQualifiedPercent', v)}
                suffix="%"
              />
              <div className="mt-2">
                <InputField
                  label="Per Item"
                  value={config.tieredQualifiedPerItem}
                  onChange={(v) => handleChange('tieredQualifiedPerItem', v)}
                  prefix="$"
                />
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-yellow-600 mb-2">Mid-Qualified</div>
              <InputField
                label="Rate"
                value={config.tieredMidQualPercent}
                onChange={(v) => handleChange('tieredMidQualPercent', v)}
                suffix="%"
              />
              <div className="mt-2">
                <InputField
                  label="Per Item"
                  value={config.tieredMidQualPerItem}
                  onChange={(v) => handleChange('tieredMidQualPerItem', v)}
                  prefix="$"
                />
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-red-600 mb-2">Non-Qualified</div>
              <InputField
                label="Rate"
                value={config.tieredNonQualPercent}
                onChange={(v) => handleChange('tieredNonQualPercent', v)}
                suffix="%"
              />
              <div className="mt-2">
                <InputField
                  label="Per Item"
                  value={config.tieredNonQualPerItem}
                  onChange={(v) => handleChange('tieredNonQualPerItem', v)}
                  prefix="$"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FLAT RATE (collapsed by default) */}
      <div className="bg-white rounded-lg mb-3 border overflow-hidden">
        <div className="px-3">
          <SectionHeader 
            title="Flat Rate (Optional Comparison)" 
            section="flatRate"
            enabled={config.flatRateEnabled}
            onToggleEnabled={(v) => handleChange('flatRateEnabled', v)}
          />
        </div>
        {expandedSections.flatRate && config.flatRateEnabled && (
          <div className="p-3 grid grid-cols-2 gap-3">
            <InputField
              label="Flat Rate"
              value={config.flatRatePercent}
              onChange={(v) => handleChange('flatRatePercent', v)}
              suffix="%"
            />
            <InputField
              label="Per Transaction"
              value={config.flatRatePerTransaction}
              onChange={(v) => handleChange('flatRatePerTransaction', v)}
              prefix="$"
            />
          </div>
        )}
      </div>

      {/* MONTHLY FEES (collapsed by default) */}
      <div className="bg-white rounded-lg mb-3 border overflow-hidden">
        <div className="px-3">
          <SectionHeader title="Monthly Fees" section="monthlyFees" />
        </div>
        {expandedSections.monthlyFees && (
          <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <InputField
              label="Service Fee"
              value={config.monthlyServiceFee}
              onChange={(v) => handleChange('monthlyServiceFee', v)}
              prefix="$"
            />
            <InputField
              label="PCI Fee"
              value={config.monthlyPciFee}
              onChange={(v) => handleChange('monthlyPciFee', v)}
              prefix="$"
            />
            <InputField
              label="Statement Fee"
              value={config.monthlyStatementFee}
              onChange={(v) => handleChange('monthlyStatementFee', v)}
              prefix="$"
            />
            <InputField
              label="Monthly Minimum"
              value={config.monthlyMinimum}
              onChange={(v) => handleChange('monthlyMinimum', v)}
              prefix="$"
            />
          </div>
        )}
      </div>

      {/* TRANSACTION FEES (collapsed by default) */}
      <div className="bg-white rounded-lg mb-3 border overflow-hidden">
        <div className="px-3">
          <SectionHeader title="Transaction Fees" section="transactionFees" />
        </div>
        {expandedSections.transactionFees && (
          <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <InputField
              label="Auth Fee"
              value={config.authFee}
              onChange={(v) => handleChange('authFee', v)}
              prefix="$"
              step="0.001"
            />
            <InputField
              label="Batch Fee"
              value={config.batchFee}
              onChange={(v) => handleChange('batchFee', v)}
              prefix="$"
            />
            <InputField
              label="AVS Fee"
              value={config.avsFee}
              onChange={(v) => handleChange('avsFee', v)}
              prefix="$"
              step="0.001"
            />
            <InputField
              label="Voice Auth"
              value={config.voiceAuthFee}
              onChange={(v) => handleChange('voiceAuthFee', v)}
              prefix="$"
            />
          </div>
        )}
      </div>

      {/* OCCURRENCE FEES (collapsed by default) */}
      <div className="bg-white rounded-lg mb-3 border overflow-hidden">
        <div className="px-3">
          <SectionHeader title="Occurrence Fees" section="occurrenceFees" />
        </div>
        {expandedSections.occurrenceFees && (
          <div className="p-3 grid grid-cols-3 gap-3">
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
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center mt-4 pt-3 border-t">
        <button
          onClick={handleSaveDefaults}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
        >
          <Save size={16} /> Save as Defaults
        </button>
        {showRecalculate && (
          <button
            onClick={handleRecalculate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <RefreshCw size={16} /> Recalculate Savings
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## Updated Calculation Engine

```javascript
/**
 * Calculate all pricing options with agent's custom configuration
 */
function calculateAllPricingOptions(statementData, pricingConfig) {
  const {
    totalVolume,
    totalTransactions,
    totalFees,
    effectiveRate,
    interchange,       // If extracted from statement
    assessments,       // If extracted from statement
  } = statementData;

  // Estimate interchange if not provided (~1.5-1.6% average)
  const estimatedInterchange = interchange || (totalVolume * 0.0155);
  const estimatedAssessments = assessments || (totalVolume * 0.0013);
  const trueCost = estimatedInterchange + estimatedAssessments;
  
  const results = {
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
    options: []
  };

  // ===== DUAL PRICING =====
  if (pricingConfig.dpEnabled) {
    const dpMonthlyCost = pricingConfig.dpMonthlyCost;
    const dpEffectiveRate = (dpMonthlyCost / totalVolume) * 100;
    const dpMonthlySavings = totalFees - dpMonthlyCost;
    
    results.options.push({
      name: 'Dual Pricing',
      type: 'dual_pricing',
      recommended: true,
      monthlyCost: dpMonthlyCost.toFixed(2),
      effectiveRate: dpEffectiveRate.toFixed(4),
      monthlySavings: dpMonthlySavings.toFixed(2),
      annualSavings: (dpMonthlySavings * 12).toFixed(2),
      description: `Customer pays ${pricingConfig.dpCustomerFeePercent}% card fee`,
      details: {
        monthlyFee: pricingConfig.dpMonthlyCost,
        customerFee: pricingConfig.dpCustomerFeePercent,
        equipmentIncluded: pricingConfig.dpEquipmentIncluded,
        equipmentModel: pricingConfig.dpEquipmentModel
      }
    });
  }

  // ===== INTERCHANGE PLUS =====
  if (pricingConfig.icpEnabled) {
    const icpMarkup = totalVolume * (pricingConfig.icpMarkupPercent / 100);
    const icpTxnFees = totalTransactions * pricingConfig.icpPerTransaction;
    const icpMonthlyFees = pricingConfig.icpMonthlyFee + 
                          pricingConfig.monthlyServiceFee + 
                          pricingConfig.monthlyPciFee +
                          pricingConfig.monthlyStatementFee;
    const icpTxnOther = (pricingConfig.authFee * totalTransactions) +
                        pricingConfig.batchFee; // Assume 1 batch/day = ~30/month
    
    const icpMonthlyCost = trueCost + icpMarkup + icpTxnFees + icpMonthlyFees + icpTxnOther;
    const icpEffectiveRate = (icpMonthlyCost / totalVolume) * 100;
    const icpMonthlySavings = totalFees - icpMonthlyCost;
    
    results.options.push({
      name: 'Interchange Plus',
      type: 'interchange_plus',
      recommended: false,
      monthlyCost: icpMonthlyCost.toFixed(2),
      effectiveRate: icpEffectiveRate.toFixed(2),
      monthlySavings: icpMonthlySavings.toFixed(2),
      annualSavings: (icpMonthlySavings * 12).toFixed(2),
      description: `IC + ${pricingConfig.icpMarkupPercent}% + $${pricingConfig.icpPerTransaction}/txn`,
      details: {
        interchange: estimatedInterchange.toFixed(2),
        assessments: estimatedAssessments.toFixed(2),
        markup: icpMarkup.toFixed(2),
        transactionFees: icpTxnFees.toFixed(2),
        monthlyFees: icpMonthlyFees.toFixed(2)
      }
    });
  }

  // ===== TIERED =====
  if (pricingConfig.tieredEnabled) {
    // Estimate qual/mid/non-qual split (typical: 70/20/10)
    const qualVolume = totalVolume * 0.70;
    const midVolume = totalVolume * 0.20;
    const nonQualVolume = totalVolume * 0.10;
    
    const qualTxns = totalTransactions * 0.70;
    const midTxns = totalTransactions * 0.20;
    const nonQualTxns = totalTransactions * 0.10;
    
    const tieredCost = 
      (qualVolume * (pricingConfig.tieredQualifiedPercent / 100)) +
      (qualTxns * pricingConfig.tieredQualifiedPerItem) +
      (midVolume * (pricingConfig.tieredMidQualPercent / 100)) +
      (midTxns * pricingConfig.tieredMidQualPerItem) +
      (nonQualVolume * (pricingConfig.tieredNonQualPercent / 100)) +
      (nonQualTxns * pricingConfig.tieredNonQualPerItem) +
      pricingConfig.monthlyServiceFee;
    
    const tieredEffectiveRate = (tieredCost / totalVolume) * 100;
    const tieredMonthlySavings = totalFees - tieredCost;
    
    results.options.push({
      name: 'Tiered Pricing',
      type: 'tiered',
      recommended: false,
      monthlyCost: tieredCost.toFixed(2),
      effectiveRate: tieredEffectiveRate.toFixed(2),
      monthlySavings: tieredMonthlySavings.toFixed(2),
      annualSavings: (tieredMonthlySavings * 12).toFixed(2),
      description: `Qual ${pricingConfig.tieredQualifiedPercent}% / Mid ${pricingConfig.tieredMidQualPercent}% / Non ${pricingConfig.tieredNonQualPercent}%`,
      details: {
        qualifiedRate: pricingConfig.tieredQualifiedPercent,
        midQualRate: pricingConfig.tieredMidQualPercent,
        nonQualRate: pricingConfig.tieredNonQualPercent
      }
    });
  }

  // ===== FLAT RATE =====
  if (pricingConfig.flatRateEnabled) {
    const flatCost = (totalVolume * (pricingConfig.flatRatePercent / 100)) +
                    (totalTransactions * pricingConfig.flatRatePerTransaction) +
                    pricingConfig.monthlyServiceFee;
    
    const flatEffectiveRate = pricingConfig.flatRatePercent;
    const flatMonthlySavings = totalFees - flatCost;
    
    results.options.push({
      name: 'Flat Rate',
      type: 'flat_rate',
      recommended: false,
      monthlyCost: flatCost.toFixed(2),
      effectiveRate: flatEffectiveRate.toFixed(2),
      monthlySavings: flatMonthlySavings.toFixed(2),
      annualSavings: (flatMonthlySavings * 12).toFixed(2),
      description: `${pricingConfig.flatRatePercent}% flat rate`,
      details: {
        rate: pricingConfig.flatRatePercent,
        perTransaction: pricingConfig.flatRatePerTransaction
      }
    });
  }

  // Sort by savings (highest first)
  results.options.sort((a, b) => parseFloat(b.annualSavings) - parseFloat(a.annualSavings));
  
  // Mark best option as recommended
  if (results.options.length > 0) {
    results.options.forEach(opt => opt.recommended = false);
    results.options[0].recommended = true;
  }

  // Summary stats
  const bestOption = results.options[0];
  results.maxMonthlySavings = bestOption?.monthlySavings || '0.00';
  results.maxAnnualSavings = bestOption?.annualSavings || '0.00';
  results.recommendedOption = bestOption?.type || 'dual_pricing';

  return results;
}
```

---

## Integration Points

### 1. Statement Analyzer Page

```jsx
// In StatementAnalyzer.jsx
import PricingConfiguration from './PricingConfiguration';

function StatementAnalyzer() {
  const [analysisResults, setAnalysisResults] = useState(null);
  const [pricingConfig, setPricingConfig] = useState(null);
  const [showPricingConfig, setShowPricingConfig] = useState(false);

  const handleAnalysisComplete = (results) => {
    setAnalysisResults(results);
    setShowPricingConfig(true); // Show pricing config after analysis
  };

  const handlePricingChange = (newConfig) => {
    setPricingConfig(newConfig);
    // Recalculate with new pricing
    if (analysisResults) {
      const recalculated = calculateAllPricingOptions(
        analysisResults.statementData, 
        newConfig
      );
      setAnalysisResults({ ...analysisResults, savings: recalculated });
    }
  };

  return (
    <div>
      {/* Upload/Manual Entry Section */}
      <StatementUpload onComplete={handleAnalysisComplete} />
      
      {/* Pricing Configuration - shown after analysis */}
      {showPricingConfig && (
        <PricingConfiguration
          onConfigChange={handlePricingChange}
          initialConfig={pricingConfig}
          showRecalculate={true}
        />
      )}
      
      {/* Results */}
      {analysisResults && <AnalysisResults data={analysisResults} />}
    </div>
  );
}
```

### 2. Proposal Generator Page

```jsx
// In ProposalGenerator.jsx
function ProposalGenerator() {
  const [pricingConfig, setPricingConfig] = useState(null);

  return (
    <div>
      {/* Pricing Configuration - ALWAYS shown */}
      <PricingConfiguration
        onConfigChange={setPricingConfig}
        showRecalculate={false}
        compact={true}
      />
      
      {/* Proposal form uses pricingConfig */}
      <ProposalForm pricingConfig={pricingConfig} />
    </div>
  );
}
```

---

## API Endpoints

```javascript
// Get agent's saved pricing profile
app.get('/api/agent/pricing-profile', authenticate, async (req, res) => {
  const result = await db.query(`
    SELECT * FROM agent_pricing_profiles
    WHERE agent_id = $1 AND is_default = true
  `, [req.user.id]);
  
  res.json(result.rows[0] || DEFAULT_PRICING);
});

// Save agent's pricing profile
app.post('/api/agent/pricing-profile', authenticate, async (req, res) => {
  const config = req.body;
  
  await db.query(`
    INSERT INTO agent_pricing_profiles (agent_id, is_default, ...)
    VALUES ($1, true, ...)
    ON CONFLICT (agent_id) WHERE is_default = true
    DO UPDATE SET ...
  `, [req.user.id, ...Object.values(config)]);
  
  res.json({ success: true });
});

// Calculate savings with custom pricing
app.post('/api/calculate-savings', async (req, res) => {
  const { statementData, pricingConfig } = req.body;
  const results = calculateAllPricingOptions(statementData, pricingConfig);
  res.json(results);
});
```

---

## Summary: What Gets Added

| Feature | Statement Analyzer | Proposal Generator |
|---------|-------------------|-------------------|
| **Dual Pricing Config** | ✅ Monthly cost, customer fee % | ✅ |
| **IC+ Config** | ✅ Markup %, per-txn, monthly | ✅ |
| **Tiered Config** | ✅ Qual/Mid/Non rates | ✅ |
| **Flat Rate Config** | ✅ Rate %, per-txn | ✅ |
| **Monthly Fees** | ✅ Service, PCI, statement | ✅ |
| **Transaction Fees** | ✅ Auth, batch, AVS | ✅ |
| **Quick Presets** | ✅ Standard, Aggressive, High Vol | ✅ |
| **Save Defaults** | ✅ Per-agent persistence | ✅ |
| **Recalculate Button** | ✅ | Auto on change |

This gives agents full control over pricing to match their actual processor agreements.
