/**
 * AppointmentsAvailabilityCard
 * 
 * Shows scheduled appointments vs available capacity.
 * Displays per-bay breakdown with hours sold/available.
 * Feedback items: 1c, 1g
 */

import { useState } from "react";
import type { AppointmentsAvailability } from "../../hooks/useDashboardEnhanced";

interface Props {
  data: AppointmentsAvailability;
}

export function AppointmentsAvailabilityCard({ data }: Props) {
  const [expandedBay, setExpandedBay] = useState<string | null>(null);

  const utilizationColor =
    data.utilization >= 90 ? "text-red-400" :
    data.utilization >= 70 ? "text-green-400" :
    data.utilization >= 40 ? "text-yellow-400" :
    "text-gray-400";

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Appointments / Availability
          </h3>
        </div>
        <div className={`text-2xl font-bold font-mono ${utilizationColor}`}>
          {data.utilization}%
          <span className="text-xs font-normal text-gray-500 ml-1">utilized</span>
        </div>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white/[0.03] rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-white font-mono">{data.totalScheduled}</div>
          <div className="text-[11px] text-gray-500">Scheduled</div>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-[#D4782F] font-mono">
            {data.totalHoursBooked.toFixed(1)}h
          </div>
          <div className="text-[11px] text-gray-500">Hours Sold</div>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-green-400 font-mono">
            {data.totalHoursAvailable.toFixed(1)}h
          </div>
          <div className="text-[11px] text-gray-500">Hours Available</div>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-white font-mono">
            {data.totalSellableHours.toFixed(1)}h
          </div>
          <div className="text-[11px] text-gray-500">Total Capacity</div>
        </div>
      </div>

      {/* Utilization bar */}
      <div className="w-full h-3 bg-white/[0.05] rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            data.utilization >= 90 ? "bg-red-500" :
            data.utilization >= 70 ? "bg-green-500" :
            data.utilization >= 40 ? "bg-yellow-500" :
            "bg-gray-500"
          }`}
          style={{ width: `${Math.min(data.utilization, 100)}%` }}
        />
      </div>

      {/* Per-bay breakdown */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Bay Breakdown
        </div>
        {(data.bays as any[]).map((bay) => {
          const bayHoursBooked = parseFloat(bay.hours_booked || "0");
          const bayCapacity = parseFloat(bay.sellable_hours_per_day || "8");
          const bayUtil = bayCapacity > 0 ? Math.round((bayHoursBooked / bayCapacity) * 100) : 0;
          const isExpanded = expandedBay === bay.id;

          return (
            <button
              key={bay.id}
              onClick={() => setExpandedBay(isExpanded ? null : bay.id)}
              className="w-full text-left bg-white/[0.02] border border-white/[0.04] rounded-lg p-3
                         hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">
                    {bay.name || `Bay ${bay.bay_number}`}
                  </span>
                  <span className="text-xs text-gray-500">
                    {bay.appointment_count} appt{parseInt(bay.appointment_count) !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {bayHoursBooked.toFixed(1)}h / {bayCapacity}h
                  </span>
                  <div className="w-16 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        bayUtil >= 90 ? "bg-red-500" :
                        bayUtil >= 70 ? "bg-green-500" :
                        bayUtil >= 40 ? "bg-yellow-500" :
                        "bg-gray-500"
                      }`}
                      style={{ width: `${Math.min(bayUtil, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-mono font-bold ${
                    bayUtil >= 90 ? "text-red-400" :
                    bayUtil >= 70 ? "text-green-400" :
                    "text-gray-400"
                  }`}>
                    {bayUtil}%
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-white/[0.05] text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Hours available to sell:</span>
                    <span className="text-green-400 font-mono font-bold">
                      {parseFloat(bay.hours_available || "0").toFixed(1)}h
                    </span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
