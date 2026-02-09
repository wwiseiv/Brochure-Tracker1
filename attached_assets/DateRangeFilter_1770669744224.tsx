/**
 * DateRangeFilter — Reusable date range picker for dashboard cards
 * 
 * Provides quick presets (Today, This Week, This Month, All)
 * plus a custom date range picker.
 */

import { useState } from "react";

interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onChange: (dateFrom: string, dateTo: string) => void;
  showAllOption?: boolean;
  onShowAll?: () => void;
  isShowingAll?: boolean;
  className?: string;
}

type Preset = "today" | "this_week" | "this_month" | "custom";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getStartOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day); // Sunday
  return d.toISOString().split("T")[0];
}

function getStartOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onChange,
  showAllOption = false,
  onShowAll,
  isShowingAll = false,
  className = "",
}: DateRangeFilterProps) {
  const [showCustom, setShowCustom] = useState(false);

  const handlePreset = (preset: Preset) => {
    setShowCustom(false);
    switch (preset) {
      case "today":
        onChange(getToday(), getToday());
        break;
      case "this_week":
        onChange(getStartOfWeek(), getToday());
        break;
      case "this_month":
        onChange(getStartOfMonth(), getToday());
        break;
      case "custom":
        setShowCustom(true);
        break;
    }
  };

  // Determine active preset
  const today = getToday();
  const startOfWeek = getStartOfWeek();
  const startOfMonth = getStartOfMonth();

  let activePreset: string = "custom";
  if (isShowingAll) activePreset = "all";
  else if (dateFrom === today && dateTo === today) activePreset = "today";
  else if (dateFrom === startOfWeek && dateTo === today) activePreset = "this_week";
  else if (dateFrom === startOfMonth && dateTo === today) activePreset = "this_month";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Preset buttons */}
      {["today", "this_week", "this_month"].map((preset) => (
        <button
          key={preset}
          onClick={() => handlePreset(preset as Preset)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activePreset === preset
              ? "bg-[#1B3A6B] text-white"
              : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
          }`}
        >
          {preset === "today" ? "Today" : preset === "this_week" ? "This Week" : "This Month"}
        </button>
      ))}

      {/* All Open option */}
      {showAllOption && (
        <button
          onClick={onShowAll}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activePreset === "all"
              ? "bg-[#D4782F] text-white"
              : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
          }`}
        >
          All Open
        </button>
      )}

      {/* Custom date range */}
      <button
        onClick={() => handlePreset("custom")}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          activePreset === "custom" && !isShowingAll
            ? "bg-[#1B3A6B] text-white"
            : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
        }`}
      >
        Custom
      </button>

      {/* Custom date inputs */}
      {showCustom && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onChange(e.target.value, dateTo)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-300
                       focus:border-[#1B3A6B] focus:outline-none"
          />
          <span className="text-gray-500 text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onChange(dateFrom, e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-300
                       focus:border-[#1B3A6B] focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
