import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Settings, 
  ChevronDown, 
  ChevronUp,
  Save,
  DollarSign,
  Percent,
  CreditCard
} from "lucide-react";

export interface PricingConfig {
  pricingModel: "dual_pricing" | "interchange_plus" | "surcharge";
  
  dualPricingCustomerFee: number;
  dualPricingMonthlyFee: number;
  
  icPlusMarkupPercent: number;
  icPlusPerTransaction: number;
  icPlusMonthlyFee: number;
  
  surchargeRate: number;
  
  authFeeElectronic: number;
  authFeeVoice: number;
  authFeeAVS: number;
  authFeePinDebit: number;
  
  monthlyServiceFee: number;
  monthlyStatementFee: number;
  monthlyPciFee: number;
  monthlyPciNonCompFee: number;
  monthlyMinimum: number;
  monthlyGatewayFee: number;
  monthlyWirelessFee: number;
  
  batchFee: number;
  chargebackFee: number;
  retrievalFee: number;
  achRejectFee: number;
  annualFee: number;
}

const DEFAULT_CONFIG: PricingConfig = {
  pricingModel: "dual_pricing",
  
  dualPricingCustomerFee: 3.99,
  dualPricingMonthlyFee: 0.00,
  
  icPlusMarkupPercent: 0.60,
  icPlusPerTransaction: 0.12,
  icPlusMonthlyFee: 9.95,
  
  surchargeRate: 3.00,
  
  authFeeElectronic: 0.00,
  authFeeVoice: 0.00,
  authFeeAVS: 0.00,
  authFeePinDebit: 0.00,
  
  monthlyServiceFee: 0.00,
  monthlyStatementFee: 0.00,
  monthlyPciFee: 0.00,
  monthlyPciNonCompFee: 0.00,
  monthlyMinimum: 0.00,
  monthlyGatewayFee: 0.00,
  monthlyWirelessFee: 0.00,
  
  batchFee: 0.00,
  chargebackFee: 25.00,
  retrievalFee: 15.00,
  achRejectFee: 25.00,
  annualFee: 0.00,
};

const PRESETS: Record<string, { name: string; config: Partial<PricingConfig> }> = {
  "standard": {
    name: "PCBancard Standard",
    config: {
      pricingModel: "dual_pricing",
      dualPricingCustomerFee: 3.99,
      dualPricingMonthlyFee: 64.95,
      icPlusMarkupPercent: 0.20,
      icPlusPerTransaction: 0.10,
      icPlusMonthlyFee: 9.95,
    }
  },
  "aggressive": {
    name: "Aggressive Pricing",
    config: {
      pricingModel: "dual_pricing",
      dualPricingCustomerFee: 3.49,
      dualPricingMonthlyFee: 49.95,
      icPlusMarkupPercent: 0.15,
      icPlusPerTransaction: 0.08,
      icPlusMonthlyFee: 0.00,
    }
  },
  "high-volume": {
    name: "High Volume ($250K+)",
    config: {
      pricingModel: "interchange_plus",
      icPlusMarkupPercent: 0.10,
      icPlusPerTransaction: 0.05,
      icPlusMonthlyFee: 0.00,
      dualPricingCustomerFee: 3.99,
      dualPricingMonthlyFee: 99.95,
    }
  },
  "zero-cost": {
    name: "Zero Cost (Surcharge)",
    config: {
      pricingModel: "surcharge",
      surchargeRate: 3.00,
    }
  }
};

interface PricingConfigurationProps {
  onConfigChange?: (config: PricingConfig) => void;
  initialConfig?: Partial<PricingConfig>;
  compact?: boolean;
  showPresets?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export default function PricingConfiguration({
  onConfigChange,
  initialConfig = {},
  compact = false,
  showPresets = true,
  collapsible = true,
  defaultCollapsed = true
}: PricingConfigurationProps) {
  const [config, setConfig] = useState<PricingConfig>({ ...DEFAULT_CONFIG, ...initialConfig });
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);
  const [showAuthFees, setShowAuthFees] = useState(false);
  const [showMonthlyFees, setShowMonthlyFees] = useState(false);
  const [showMiscFees, setShowMiscFees] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("agentPricingDefaults");
    if (saved && Object.keys(initialConfig).length === 0) {
      try {
        const parsed = JSON.parse(saved);
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
      } catch (e) {
        console.error("Failed to load saved pricing defaults");
      }
    }
  }, []);

  useEffect(() => {
    onConfigChange?.(config);
  }, [config, onConfigChange]);

  const handleChange = (field: keyof PricingConfig, value: number | string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handlePresetChange = (presetKey: string) => {
    if (presetKey && PRESETS[presetKey]) {
      setConfig(prev => ({ ...prev, ...PRESETS[presetKey].config }));
    }
  };

  const handleSaveDefaults = () => {
    localStorage.setItem("agentPricingDefaults", JSON.stringify(config));
    alert("Saved as your defaults");
  };

  const InputField = ({ 
    label, 
    value, 
    onChange, 
    prefix, 
    suffix, 
    step = "0.01", 
    min = "0",
    max
  }: { 
    label: string; 
    value: number; 
    onChange: (v: number) => void; 
    prefix?: string; 
    suffix?: string; 
    step?: string;
    min?: string;
    max?: string;
  }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center border rounded-md px-2 py-1.5 bg-background">
        {prefix && <span className="text-muted-foreground mr-1 text-sm">{prefix}</span>}
        <Input
          type="number"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="border-0 p-0 text-right h-auto focus-visible:ring-0"
        />
        {suffix && <span className="text-muted-foreground ml-1 text-sm">{suffix}</span>}
      </div>
    </div>
  );

  const content = (
    <div className="space-y-4">
      {showPresets && (
        <div className="flex items-center justify-between gap-4">
          <select
            onChange={(e) => handlePresetChange(e.target.value)}
            className="text-sm border rounded-md px-3 py-2 bg-background"
            defaultValue=""
            data-testid="select-pricing-preset"
          >
            <option value="">Quick Presets...</option>
            {Object.entries(PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>{preset.name}</option>
            ))}
          </select>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSaveDefaults}
            className="gap-2"
            data-testid="button-save-pricing-defaults"
          >
            <Save className="h-4 w-4" />
            Save as Defaults
          </Button>
        </div>
      )}

      <div className="bg-muted/30 rounded-lg p-4 border">
        <div className="text-sm font-medium mb-3">Select Pricing Model</div>
        
        <div className="space-y-2">
          <label 
            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border-2 transition-colors ${
              config.pricingModel === "dual_pricing" 
                ? "border-green-500 bg-green-50 dark:bg-green-950/30" 
                : "border-transparent hover:bg-muted/50"
            }`}
          >
            <input
              type="radio"
              name="pricingModel"
              checked={config.pricingModel === "dual_pricing"}
              onChange={() => handleChange("pricingModel", "dual_pricing")}
              className="mt-1"
              data-testid="radio-dual-pricing"
            />
            <div className="flex-1">
              <div className="font-medium flex items-center gap-2">
                Dual Pricing
                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">DEFAULT</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Customer pays card fee, merchant pays flat monthly
              </div>
            </div>
          </label>

          <label 
            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border-2 transition-colors ${
              config.pricingModel === "interchange_plus" 
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" 
                : "border-transparent hover:bg-muted/50"
            }`}
          >
            <input
              type="radio"
              name="pricingModel"
              checked={config.pricingModel === "interchange_plus"}
              onChange={() => handleChange("pricingModel", "interchange_plus")}
              className="mt-1"
              data-testid="radio-interchange-plus"
            />
            <div className="flex-1">
              <div className="font-medium">Cost Plus (Interchange Plus)</div>
              <div className="text-sm text-muted-foreground">
                True interchange + markup % + per-transaction fee
              </div>
            </div>
          </label>

          <label 
            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border-2 transition-colors ${
              config.pricingModel === "surcharge" 
                ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30" 
                : "border-transparent hover:bg-muted/50"
            }`}
          >
            <input
              type="radio"
              name="pricingModel"
              checked={config.pricingModel === "surcharge"}
              onChange={() => handleChange("pricingModel", "surcharge")}
              className="mt-1"
              data-testid="radio-surcharge"
            />
            <div className="flex-1">
              <div className="font-medium">Surcharge</div>
              <div className="text-sm text-muted-foreground">
                Flat rate up to 3% (debit cards cannot be surcharged)
              </div>
            </div>
          </label>
        </div>
      </div>

      {config.pricingModel === "dual_pricing" && (
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border-l-4 border-green-500">
          <div className="font-medium text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Dual Pricing Settings
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Customer Card Fee"
              value={config.dualPricingCustomerFee}
              onChange={(v) => handleChange("dualPricingCustomerFee", v)}
              suffix="%"
            />
            <InputField
              label="Monthly Fee (to Merchant)"
              value={config.dualPricingMonthlyFee}
              onChange={(v) => handleChange("dualPricingMonthlyFee", v)}
              prefix="$"
            />
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-3 bg-green-100 dark:bg-green-900/50 p-2 rounded">
            Customer pays {config.dualPricingCustomerFee}% on card transactions.
            {config.dualPricingMonthlyFee > 0 && ` Merchant pays $${config.dualPricingMonthlyFee.toFixed(2)}/month.`}
          </div>
        </div>
      )}

      {config.pricingModel === "interchange_plus" && (
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border-l-4 border-blue-500">
          <div className="font-medium text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Interchange Plus Settings
          </div>
          <div className="grid grid-cols-3 gap-4">
            <InputField
              label="Markup (Basis Points)"
              value={config.icPlusMarkupPercent}
              onChange={(v) => handleChange("icPlusMarkupPercent", v)}
              suffix="%"
            />
            <InputField
              label="Per-Transaction Fee"
              value={config.icPlusPerTransaction}
              onChange={(v) => handleChange("icPlusPerTransaction", v)}
              prefix="$"
            />
            <InputField
              label="Monthly Fee"
              value={config.icPlusMonthlyFee}
              onChange={(v) => handleChange("icPlusMonthlyFee", v)}
              prefix="$"
            />
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-3 bg-blue-100 dark:bg-blue-900/50 p-2 rounded">
            Formula: True Interchange + {config.icPlusMarkupPercent}% + ${config.icPlusPerTransaction.toFixed(2)}/txn
            {config.icPlusMonthlyFee > 0 && ` + $${config.icPlusMonthlyFee.toFixed(2)}/month`}
          </div>
        </div>
      )}

      {config.pricingModel === "surcharge" && (
        <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-4 border-l-4 border-orange-500">
          <div className="font-medium text-orange-700 dark:text-orange-300 mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Surcharge Settings
          </div>
          <div className="w-48">
            <InputField
              label="Surcharge Rate"
              value={config.surchargeRate}
              onChange={(v) => handleChange("surchargeRate", Math.min(v, 3.00))}
              suffix="%"
              max="3.00"
            />
          </div>
          <div className="text-xs text-orange-600 dark:text-orange-400 mt-3 bg-orange-100 dark:bg-orange-900/50 p-2 rounded flex items-center gap-2">
            <span className="font-bold">Note:</span> Maximum 3% by law. Debit cards cannot be surcharged.
          </div>
        </div>
      )}

      {!compact && (
        <>
          <Collapsible open={showAuthFees} onOpenChange={setShowAuthFees}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-4 py-2 h-auto">
                <span className="font-medium text-sm">Authorization Fees</span>
                {showAuthFees ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <InputField
                  label="Electronic Auth"
                  value={config.authFeeElectronic}
                  onChange={(v) => handleChange("authFeeElectronic", v)}
                  prefix="$"
                  step="0.001"
                />
                <InputField
                  label="Voice Auth"
                  value={config.authFeeVoice}
                  onChange={(v) => handleChange("authFeeVoice", v)}
                  prefix="$"
                />
                <InputField
                  label="AVS"
                  value={config.authFeeAVS}
                  onChange={(v) => handleChange("authFeeAVS", v)}
                  prefix="$"
                  step="0.001"
                />
                <InputField
                  label="PIN Debit Auth"
                  value={config.authFeePinDebit}
                  onChange={(v) => handleChange("authFeePinDebit", v)}
                  prefix="$"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={showMonthlyFees} onOpenChange={setShowMonthlyFees}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-4 py-2 h-auto">
                <span className="font-medium text-sm">Monthly Fees</span>
                {showMonthlyFees ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <InputField
                  label="Monthly Service Fee"
                  value={config.monthlyServiceFee}
                  onChange={(v) => handleChange("monthlyServiceFee", v)}
                  prefix="$"
                />
                <InputField
                  label="Statement Fee"
                  value={config.monthlyStatementFee}
                  onChange={(v) => handleChange("monthlyStatementFee", v)}
                  prefix="$"
                />
                <InputField
                  label="PCI Compliance Fee"
                  value={config.monthlyPciFee}
                  onChange={(v) => handleChange("monthlyPciFee", v)}
                  prefix="$"
                />
                <InputField
                  label="PCI Non-Compliance Fee"
                  value={config.monthlyPciNonCompFee}
                  onChange={(v) => handleChange("monthlyPciNonCompFee", v)}
                  prefix="$"
                />
                <InputField
                  label="Monthly Minimum"
                  value={config.monthlyMinimum}
                  onChange={(v) => handleChange("monthlyMinimum", v)}
                  prefix="$"
                />
                <InputField
                  label="Gateway Fee"
                  value={config.monthlyGatewayFee}
                  onChange={(v) => handleChange("monthlyGatewayFee", v)}
                  prefix="$"
                />
                <InputField
                  label="Wireless Fee"
                  value={config.monthlyWirelessFee}
                  onChange={(v) => handleChange("monthlyWirelessFee", v)}
                  prefix="$"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={showMiscFees} onOpenChange={setShowMiscFees}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-4 py-2 h-auto">
                <span className="font-medium text-sm">Miscellaneous Fees</span>
                {showMiscFees ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <InputField
                  label="Batch Fee"
                  value={config.batchFee}
                  onChange={(v) => handleChange("batchFee", v)}
                  prefix="$"
                />
                <InputField
                  label="Chargeback Fee"
                  value={config.chargebackFee}
                  onChange={(v) => handleChange("chargebackFee", v)}
                  prefix="$"
                />
                <InputField
                  label="Retrieval Fee"
                  value={config.retrievalFee}
                  onChange={(v) => handleChange("retrievalFee", v)}
                  prefix="$"
                />
                <InputField
                  label="ACH Reject Fee"
                  value={config.achRejectFee}
                  onChange={(v) => handleChange("achRejectFee", v)}
                  prefix="$"
                />
                <InputField
                  label="Annual Fee"
                  value={config.annualFee}
                  onChange={(v) => handleChange("annualFee", v)}
                  prefix="$"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </div>
  );

  if (!collapsible) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">Pricing Configuration</span>
          </div>
          {content}
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-muted/30">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover-elevate rounded-lg">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">Pricing Configuration</span>
              {!isOpen && (
                <span className="text-sm text-muted-foreground">
                  ({config.pricingModel === "dual_pricing" 
                    ? `Dual Pricing ${config.dualPricingCustomerFee}%` 
                    : config.pricingModel === "interchange_plus"
                    ? `IC+ ${config.icPlusMarkupPercent}%`
                    : `Surcharge ${config.surchargeRate}%`})
                </span>
              )}
            </div>
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            {content}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export { DEFAULT_CONFIG as DEFAULT_PRICING_CONFIG };
