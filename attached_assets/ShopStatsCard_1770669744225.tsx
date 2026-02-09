/**
 * ShopStatsCard
 * 
 * Advisor daily view showing operational metrics:
 * - Hours sold / hours available
 * - Who's off today
 * - Pending customer approvals
 * 
 * Feedback item: 1g
 */

import type { ShopStats, AppointmentsAvailability } from "../../hooks/useDashboardEnhanced";

interface Props {
  stats: ShopStats;
  availability?: AppointmentsAvailability;
}

export function ShopStatsCard({ stats, availability }: Props) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
        Today's Shop Stats
      </h3>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {/* Appointments */}
        {availability && (
          <>
            <div className="bg-white/[0.03] rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Appointments</div>
              <div className="text-xl font-bold text-white font-mono">
                {availability.totalScheduled}
              </div>
              <div className="text-[10px] text-gray-500">scheduled</div>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Available Slots</div>
              <div className="text-xl font-bold text-green-400 font-mono">
                {availability.totalHoursAvailable.toFixed(1)}h
              </div>
              <div className="text-[10px] text-gray-500">hours to sell</div>
            </div>
          </>
        )}

        {/* Hours Sold */}
        <div className="bg-white/[0.03] rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Hours Sold</div>
          <div className="text-xl font-bold text-[#D4782F] font-mono">
            {stats.hoursSold.toFixed(1)}h
          </div>
          <div className="text-[10px] text-gray-500">labor booked</div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white/[0.03] rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Pending Approvals</div>
          <div className={`text-xl font-bold font-mono ${
            stats.pendingApprovals > 0 ? "text-yellow-400" : "text-green-400"
          }`}>
            {stats.pendingApprovals}
          </div>
          <div className="text-[10px] text-gray-500">awaiting customer</div>
        </div>
      </div>

      {/* Who's Off Today */}
      <div className="border-t border-white/[0.06] pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Who's Off Today
          </span>
          {stats.staffOff.length === 0 && (
            <span className="text-xs text-green-400">Everyone's in ✓</span>
          )}
        </div>

        {stats.staffOff.length > 0 ? (
          <div className="space-y-1.5">
            {stats.staffOff.map((person) => (
              <div
                key={person.id}
                className="flex items-center justify-between bg-white/[0.02] rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] text-red-400 font-bold">
                    {person.first_name.charAt(0)}{person.last_name.charAt(0)}
                  </div>
                  <span className="text-sm text-gray-300">
                    {person.first_name} {person.last_name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 capitalize">
                    {person.role.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {person.reason}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
