/**
 * DashboardVisibilitySettings
 * 
 * Settings page where the owner/admin controls which dashboard cards
 * each role can see. Simple toggle grid — point and click.
 * 
 * Route: /settings/dashboard-visibility
 * Feedback items: 1d, 1e, 1g
 */

import { useState, useEffect } from "react";
import {
  useDashboardVisibility,
  useUpdateDashboardVisibility,
  type VisibilitySettings,
} from "../../hooks/useDashboardEnhanced";

// Card display labels
const CARD_LABELS: Record<string, { label: string; description: string }> = {
  revenue: {
    label: "Today's Revenue",
    description: "Total payments collected for the period",
  },
  cars_in_shop: {
    label: "Cars In Shop",
    description: "Active vehicles in progress or waiting",
  },
  aro: {
    label: "Avg Repair Order",
    description: "Average ticket size for invoiced/paid ROs",
  },
  approval_rate: {
    label: "Approval Rate",
    description: "Percentage of sent estimates that get approved",
  },
  fees_saved: {
    label: "Fees Saved (Dual Pricing)",
    description: "Money saved by cash-paying customers",
  },
  appointments_availability: {
    label: "Appointments / Availability",
    description: "Scheduled vs. available capacity by bay",
  },
  open_ros: {
    label: "Open Repair Orders",
    description: "Active ROs with status and date filtering",
  },
  quick_actions: {
    label: "Quick Actions",
    description: "Shortcut buttons for common tasks",
  },
  shop_stats: {
    label: "Shop Stats (Advisor View)",
    description: "Hours sold, hours available, who's off, pending approvals",
  },
};

const ROLES = [
  { key: "owner", label: "Owner" },
  { key: "admin", label: "Admin" },
  { key: "service_advisor", label: "Service Advisor" },
  { key: "technician", label: "Technician" },
  { key: "bookkeeper", label: "Bookkeeper" },
];

const CARD_KEYS = Object.keys(CARD_LABELS);

export function DashboardVisibilitySettings() {
  const { data, isLoading } = useDashboardVisibility();
  const updateMutation = useUpdateDashboardVisibility();
  const [localSettings, setLocalSettings] = useState<VisibilitySettings>({});
  const [isDirty, setIsDirty] = useState(false);

  // Initialize local state from server data
  useEffect(() => {
    if (data?.settings) {
      setLocalSettings(data.settings);
    }
  }, [data]);

  const toggleCard = (role: string, cardKey: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [cardKey]: !(prev[role]?.[cardKey] ?? true),
      },
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    updateMutation.mutate(localSettings, {
      onSuccess: () => setIsDirty(false),
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 text-gray-500 animate-pulse">
        Loading visibility settings...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard Visibility</h1>
          <p className="text-sm text-gray-500 mt-1">
            Control which dashboard cards each role can see. Toggle switches on
            or off — changes take effect immediately for all users in that role.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty || updateMutation.isPending}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isDirty
              ? "bg-[#D4782F] text-white hover:bg-[#c06a25]"
              : "bg-white/5 text-gray-500 cursor-not-allowed"
          }`}
        >
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Success message */}
      {updateMutation.isSuccess && !isDirty && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
          ✓ Visibility settings saved successfully
        </div>
      )}

      {/* Toggle Grid */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid gap-0" style={{
          gridTemplateColumns: `minmax(200px, 1fr) repeat(${ROLES.length}, 100px)`,
        }}>
          {/* Header row */}
          <div className="bg-[#1B3A6B] px-4 py-3 text-xs font-semibold text-white uppercase tracking-wide">
            Dashboard Card
          </div>
          {ROLES.map((role) => (
            <div
              key={role.key}
              className="bg-[#1B3A6B] px-2 py-3 text-xs font-semibold text-white uppercase tracking-wide text-center"
            >
              {role.label}
            </div>
          ))}

          {/* Card rows */}
          {CARD_KEYS.map((cardKey, i) => {
            const info = CARD_LABELS[cardKey];
            const isEven = i % 2 === 0;

            return (
              <>
                {/* Card label */}
                <div
                  key={`${cardKey}-label`}
                  className={`px-4 py-3 ${isEven ? "bg-white/[0.02]" : ""}`}
                >
                  <div className="text-sm text-white font-medium">{info.label}</div>
                  <div className="text-[11px] text-gray-500">{info.description}</div>
                </div>

                {/* Toggle cells */}
                {ROLES.map((role) => {
                  const isVisible = localSettings[role.key]?.[cardKey] ?? true;

                  // Owner always sees everything — disable toggle
                  const isOwner = role.key === "owner";

                  return (
                    <div
                      key={`${cardKey}-${role.key}`}
                      className={`flex items-center justify-center px-2 py-3 ${
                        isEven ? "bg-white/[0.02]" : ""
                      }`}
                    >
                      <button
                        onClick={() => !isOwner && toggleCard(role.key, cardKey)}
                        disabled={isOwner}
                        className={`w-10 h-6 rounded-full transition-colors relative ${
                          isOwner
                            ? "bg-green-500/30 cursor-not-allowed"
                            : isVisible
                            ? "bg-green-500"
                            : "bg-white/10"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            isVisible ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </>
            );
          })}
        </div>
      </div>

      {/* Help text */}
      <div className="mt-4 text-xs text-gray-500">
        <p>Owner visibility cannot be changed — owners always see all cards.</p>
        <p className="mt-1">
          Technicians viewing "Open ROs" will only see ROs assigned to them regardless of this setting.
        </p>
      </div>
    </div>
  );
}
