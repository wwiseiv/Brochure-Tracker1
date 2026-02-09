/**
 * OpenROsCard
 * 
 * Displays open repair orders with date range filtering
 * and a "Show All Open" toggle to see everything at once.
 * Feedback item: 1a
 */

import { useLocation } from "wouter";
import type { OpenROItem } from "../../hooks/useDashboardEnhanced";

interface Props {
  data: {
    items: OpenROItem[];
    totalOpen: number;
    showingAll: boolean;
  };
}

// Status badge colors matching existing PCB Auto theme
const statusColors: Record<string, { bg: string; text: string }> = {
  estimate: { bg: "bg-gray-500/20", text: "text-gray-300" },
  sent: { bg: "bg-blue-500/20", text: "text-blue-300" },
  approved: { bg: "bg-green-500/20", text: "text-green-300" },
  in_progress: { bg: "bg-yellow-500/20", text: "text-yellow-300" },
  waiting_parts: { bg: "bg-orange-500/20", text: "text-orange-300" },
  quality_check: { bg: "bg-purple-500/20", text: "text-purple-300" },
  completed: { bg: "bg-teal-500/20", text: "text-teal-300" },
  invoiced: { bg: "bg-indigo-500/20", text: "text-indigo-300" },
};

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num || 0);
}

export function OpenROsCard({ data }: Props) {
  const [, navigate] = useLocation();

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Open Repair Orders
        </h3>
        <span className="bg-[#D4782F]/20 text-[#D4782F] text-xs font-bold px-2.5 py-1 rounded-full">
          {data.totalOpen} open
        </span>
      </div>

      {/* RO List */}
      {data.items.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No open repair orders for this period
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {data.items.map((ro) => {
            const colors = statusColors[ro.status] || statusColors.estimate;

            return (
              <button
                key={ro.id}
                onClick={() => navigate(`/repair-orders/${ro.id}`)}
                className="w-full text-left bg-white/[0.02] border border-white/[0.04] rounded-lg p-3
                           hover:bg-white/[0.05] transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* RO Number */}
                    <span className="text-sm font-bold text-white font-mono shrink-0">
                      #{ro.ro_number}
                    </span>

                    {/* Customer + Vehicle */}
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate">
                        {ro.customer_first} {ro.customer_last}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {ro.vehicle_year} {ro.vehicle_make} {ro.vehicle_model}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {/* Amount */}
                    <span className="text-sm font-mono text-gray-300">
                      {formatCurrency(ro.total_card_price)}
                    </span>

                    {/* Status Badge */}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase
                                      ${colors.bg} ${colors.text}`}>
                      {formatStatus(ro.status)}
                    </span>

                    {/* Arrow */}
                    <span className="text-gray-600 group-hover:text-gray-400 transition-colors">
                      →
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* View All link */}
      {data.items.length > 0 && (
        <button
          onClick={() => navigate("/repair-orders")}
          className="w-full mt-3 text-center text-xs text-[#1B3A6B] hover:text-[#D4782F]
                     transition-colors font-medium"
        >
          View all repair orders →
        </button>
      )}
    </div>
  );
}
