/**
 * BayConfigurationSettings
 * 
 * Settings page where the owner configures bays and their sellable hours.
 * This data powers the Appointments/Availability dashboard widget.
 * 
 * Route: /settings/bay-configuration
 * Required for: Appointments/Availability widget (feedback 1c)
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Bay {
  id: string;
  bay_number: string;
  name: string | null;
  bay_type: string;
  sellable_hours_per_day: string;
  active: boolean;
  sort_order: number;
}

export function BayConfigurationSettings() {
  const queryClient = useQueryClient();

  // Fetch bays
  const { data: bays, isLoading } = useQuery<Bay[]>({
    queryKey: ["bays-config"],
    queryFn: async () => {
      const res = await fetch("/api/bays", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load bays");
      return res.json();
    },
  });

  // Update bay mutation
  const updateBay = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Bay> & { id: string }) => {
      const res = await fetch(`/api/bays/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update bay");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bays-config"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-enhanced"] });
    },
  });

  // Local edit state
  const [editingBay, setEditingBay] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Bay>>({});

  const startEdit = (bay: Bay) => {
    setEditingBay(bay.id);
    setEditValues({
      name: bay.name || "",
      sellable_hours_per_day: bay.sellable_hours_per_day,
      bay_type: bay.bay_type,
      active: bay.active,
    });
  };

  const saveEdit = () => {
    if (!editingBay) return;
    updateBay.mutate({
      id: editingBay,
      name: editValues.name,
      sellableHoursPerDay: parseFloat(editValues.sellable_hours_per_day || "8"),
      bayType: editValues.bay_type,
      active: editValues.active,
    } as any);
    setEditingBay(null);
  };

  const cancelEdit = () => {
    setEditingBay(null);
    setEditValues({});
  };

  if (isLoading) {
    return (
      <div className="p-6 text-gray-500 animate-pulse">Loading bay configuration...</div>
    );
  }

  // Calculate shop totals
  const activeBays = (bays || []).filter((b) => b.active);
  const totalHours = activeBays.reduce(
    (sum, b) => sum + parseFloat(b.sellable_hours_per_day || "0"), 0
  );

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Bay Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set how many sellable hours each bay produces per day. This powers the
          Appointments/Availability widget on your dashboard.
        </p>
      </div>

      {/* Summary */}
      <div className="bg-[#1B3A6B]/20 border border-[#1B3A6B]/20 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400">Total Daily Capacity</div>
            <div className="text-2xl font-bold text-white font-mono">
              {totalHours.toFixed(1)} hours
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Active Bays</div>
            <div className="text-2xl font-bold text-[#D4782F] font-mono">
              {activeBays.length}
            </div>
          </div>
        </div>
      </div>

      {/* Bay list */}
      <div className="space-y-3">
        {(bays || []).map((bay) => {
          const isEditing = editingBay === bay.id;

          return (
            <div
              key={bay.id}
              className={`bg-white/[0.03] border rounded-xl p-4 transition-colors ${
                bay.active
                  ? "border-white/[0.06]"
                  : "border-white/[0.03] opacity-50"
              }`}
            >
              {isEditing ? (
                /* ─── Edit Mode ─── */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Name */}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Bay Name</label>
                      <input
                        type="text"
                        value={editValues.name || ""}
                        onChange={(e) =>
                          setEditValues((v) => ({ ...v, name: e.target.value }))
                        }
                        placeholder={`Bay ${bay.bay_number}`}
                        className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2
                                   text-sm text-white placeholder:text-gray-500
                                   focus:border-[#1B3A6B] focus:outline-none"
                      />
                    </div>

                    {/* Hours */}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">
                        Sellable Hours / Day
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={editValues.sellable_hours_per_day || "8"}
                        onChange={(e) =>
                          setEditValues((v) => ({
                            ...v,
                            sellable_hours_per_day: e.target.value,
                          }))
                        }
                        className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2
                                   text-sm text-white font-mono
                                   focus:border-[#1B3A6B] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Type */}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Bay Type</label>
                      <select
                        value={editValues.bay_type || "general"}
                        onChange={(e) =>
                          setEditValues((v) => ({ ...v, bay_type: e.target.value }))
                        }
                        className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2
                                   text-sm text-white focus:border-[#1B3A6B] focus:outline-none"
                      >
                        <option value="general">General</option>
                        <option value="alignment">Alignment</option>
                        <option value="paint">Paint</option>
                        <option value="detail">Detail</option>
                        <option value="inspection">Inspection</option>
                      </select>
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editValues.active ?? true}
                          onChange={(e) =>
                            setEditValues((v) => ({ ...v, active: e.target.checked }))
                          }
                          className="rounded border-white/20 bg-white/5 text-[#1B3A6B]
                                     focus:ring-[#1B3A6B]"
                        />
                        <span className="text-sm text-gray-300">Active</span>
                      </label>
                    </div>
                  </div>

                  {/* Save/Cancel */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={saveEdit}
                      disabled={updateBay.isPending}
                      className="px-4 py-2 bg-[#D4782F] text-white text-sm font-medium rounded-lg
                                 hover:bg-[#c06a25] transition-colors"
                    >
                      {updateBay.isPending ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-white/5 text-gray-400 text-sm font-medium rounded-lg
                                 hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* ─── Display Mode ─── */
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => startEdit(bay)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1B3A6B]/30 flex items-center justify-center
                                    text-sm font-bold text-[#1B3A6B]">
                      {bay.bay_number}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {bay.name || `Bay ${bay.bay_number}`}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {bay.bay_type} · {bay.active ? "Active" : "Inactive"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-white font-mono">
                        {parseFloat(bay.sellable_hours_per_day || "0").toFixed(1)}h
                      </div>
                      <div className="text-[10px] text-gray-500">per day</div>
                    </div>
                    <span className="text-gray-600 text-sm">✏️</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help text */}
      <div className="mt-6 p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">How this works</h3>
        <div className="text-xs text-gray-500 space-y-1">
          <p>
            Each bay has a "sellable hours per day" value — this is how many
            billable labor hours that bay can produce in a workday.
          </p>
          <p>
            When appointments are scheduled with estimated labor hours, the
            dashboard calculates remaining capacity automatically.
          </p>
          <p>
            Example: A bay set to 8 hours with 5.5 hours booked shows 2.5
            hours available to sell.
          </p>
        </div>
      </div>
    </div>
  );
}
