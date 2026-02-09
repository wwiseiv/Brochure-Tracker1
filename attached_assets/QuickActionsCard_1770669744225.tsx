/**
 * QuickActionsCard
 * 
 * Quick action buttons on the dashboard.
 * Enhanced with "Edit Customer" action.
 * Feedback item: 1f
 */

import { useState } from "react";
import { useLocation } from "wouter";

interface Props {
  permissions: {
    canCreateRO: boolean;
    canSearchCustomer: boolean;
    canEditCustomer: boolean;
    canCreateAppointment: boolean;
  };
}

export function QuickActionsCard({ permissions }: Props) {
  const [, navigate] = useLocation();
  const [searchMode, setSearchMode] = useState<"none" | "search" | "edit">("none");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (searchMode === "edit") {
        // Navigate to customers page with search pre-filled and edit flag
        navigate(`/customers?search=${encodeURIComponent(searchQuery)}&action=edit`);
      } else {
        navigate(`/customers?search=${encodeURIComponent(searchQuery)}`);
      }
    }
  };

  const actions = [
    {
      key: "new_ro",
      label: "New Repair Order",
      icon: "🔧",
      color: "bg-[#D4782F] hover:bg-[#c06a25]",
      show: permissions.canCreateRO,
      onClick: () => navigate("/repair-orders/new"),
    },
    {
      key: "search_customer",
      label: "Quick Customer Search",
      icon: "🔍",
      color: "bg-[#1B3A6B] hover:bg-[#15305a]",
      show: permissions.canSearchCustomer,
      onClick: () => setSearchMode(searchMode === "search" ? "none" : "search"),
    },
    {
      key: "edit_customer",
      label: "Edit Customer Info",
      icon: "✏️",
      color: "bg-white/10 hover:bg-white/15 border border-white/10",
      show: permissions.canEditCustomer,
      onClick: () => setSearchMode(searchMode === "edit" ? "none" : "edit"),
    },
    {
      key: "new_appointment",
      label: "New Appointment",
      icon: "📅",
      color: "bg-white/10 hover:bg-white/15 border border-white/10",
      show: permissions.canCreateAppointment,
      onClick: () => navigate("/schedule?action=new"),
    },
  ];

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
        Quick Actions
      </h3>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        {actions
          .filter((a) => a.show)
          .map((action) => (
            <button
              key={action.key}
              onClick={action.onClick}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium
                         text-white transition-colors ${action.color}`}
            >
              <span className="text-base">{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
      </div>

      {/* Search/Edit panel */}
      {searchMode !== "none" && (
        <form onSubmit={handleSearch} className="mt-3 pt-3 border-t border-white/[0.06]">
          <div className="text-xs text-gray-400 mb-2">
            {searchMode === "edit"
              ? "Search for a customer to edit their information:"
              : "Search by name, phone, or email:"}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                searchMode === "edit"
                  ? "Customer name or phone..."
                  : "Name, phone, or email..."
              }
              autoFocus
              className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2
                         text-sm text-white placeholder:text-gray-500
                         focus:border-[#1B3A6B] focus:outline-none focus:ring-1 focus:ring-[#1B3A6B]/50"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B3A6B] text-white text-sm font-medium rounded-lg
                         hover:bg-[#15305a] transition-colors"
            >
              {searchMode === "edit" ? "Find & Edit" : "Search"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
