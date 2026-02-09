/**
 * EnhancedDashboard
 * 
 * Drop-in replacement for the existing dashboard page.
 * Role-aware, date-filtered, with all enhancement cards.
 * 
 * USAGE: Replace your current dashboard route component with this,
 *        or wrap it: <EnhancedDashboard fallback={<OldDashboard />} />
 * 
 * This component preserves all existing dashboard metrics and adds:
 * - Date range filtering (feedback 1a, 1g)
 * - Role-based card visibility (feedback 1d)
 * - Appointments/Availability widget (feedback 1c)
 * - Enhanced Quick Actions with Edit Customer (feedback 1f)
 * - Advisor Daily View / Shop Stats (feedback 1g)
 * - Removed cash/card tally from main view (feedback 1e — moved to reports)
 * - Removed total customers count from main view (feedback 1b — moved to customers page)
 */

import { useState } from "react";
import { useEnhancedDashboard } from "../../hooks/useDashboardEnhanced";
import { DateRangeFilter } from "./DateRangeFilter";
import { AppointmentsAvailabilityCard } from "./AppointmentsAvailabilityCard";
import { OpenROsCard } from "./OpenROsCard";
import { QuickActionsCard } from "./QuickActionsCard";
import { ShopStatsCard } from "./ShopStatsCard";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Get day name
function getDayName(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function EnhancedDashboard() {
  // ─── State ───
  const [dateFrom, setDateFrom] = useState(getToday());
  const [dateTo, setDateTo] = useState(getToday());
  const [showAllOpenROs, setShowAllOpenROs] = useState(false);

  // ─── Data ───
  const { data, isLoading, error } = useEnhancedDashboard(
    { dateFrom, dateTo },
    showAllOpenROs
  );

  // ─── Date range handler ───
  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    setShowAllOpenROs(false);
  };

  const handleShowAllROs = () => {
    setShowAllOpenROs(!showAllOpenROs);
  };

  if (error) {
    return (
      <div className="p-6 text-center text-red-400">
        Failed to load dashboard. Please refresh the page.
      </div>
    );
  }

  const vis = data?.visibility || {};

  // TODO: Replace with your actual auth context
  // const { user } = useAuth();
  // const userName = user?.firstName || "there";
  const userName = "there"; // Placeholder — replace with your auth

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">
            {getGreeting()}, {userName} 👋
          </h1>
          <p className="text-sm text-gray-500">{getDayName()}</p>
        </div>

        {/* Global date filter */}
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={handleDateChange}
        />
      </div>

      {/* ─── Loading skeleton ─── */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/[0.03] rounded-xl p-5 animate-pulse">
              <div className="h-3 bg-white/[0.05] rounded w-20 mb-3" />
              <div className="h-7 bg-white/[0.05] rounded w-24" />
            </div>
          ))}
        </div>
      )}

      {data && (
        <>
          {/* ─── Top Stats Row ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Revenue */}
            {vis.revenue && data.revenue && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  Revenue
                </div>
                <div className="text-2xl font-bold text-white font-mono mt-1">
                  {formatCurrency(data.revenue.total_revenue)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {data.revenue.payment_count} payments
                </div>
              </div>
            )}

            {/* Cars In Shop */}
            {vis.cars_in_shop && data.carsInShop && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  Cars In Shop
                </div>
                <div className="text-2xl font-bold text-white font-mono mt-1">
                  {data.carsInShop.total}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {data.carsInShop.in_progress} active · {data.carsInShop.waiting} waiting
                </div>
              </div>
            )}

            {/* ARO */}
            {vis.aro && data.aro && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  Avg Repair Order
                </div>
                <div className="text-2xl font-bold text-white font-mono mt-1">
                  {formatCurrency(data.aro.avg_repair_order)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {data.aro.ro_count} orders
                </div>
              </div>
            )}

            {/* Approval Rate */}
            {vis.approval_rate && data.approvalRate && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  Approval Rate
                </div>
                <div className="text-2xl font-bold text-green-400 font-mono mt-1">
                  {data.approvalRate.approval_rate}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {data.approvalRate.approved_count} of {data.approvalRate.sent_count} sent
                </div>
              </div>
            )}
          </div>

          {/* ─── Fees Saved (role-gated) ─── */}
          {vis.fees_saved && data.feesSaved && (
            <div className="bg-gradient-to-r from-[#1B3A6B]/20 to-transparent border border-[#1B3A6B]/20 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                    💰 Fees Saved (Dual Pricing)
                  </div>
                  <div className="text-2xl font-bold text-green-400 font-mono mt-1">
                    {formatCurrency(data.feesSaved.fees_saved)}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  Card volume: {formatCurrency(data.feesSaved.card_volume)}
                </div>
              </div>
            </div>
          )}

          {/* ─── Main Content Grid ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-6">
              {/* Appointments / Availability */}
              {vis.appointments_availability && data.appointmentsAvailability && (
                <AppointmentsAvailabilityCard data={data.appointmentsAvailability} />
              )}

              {/* Shop Stats / Advisor Daily View */}
              {vis.shop_stats && data.shopStats && (
                <ShopStatsCard
                  stats={data.shopStats}
                  availability={data.appointmentsAvailability}
                />
              )}
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Open ROs with date filter */}
              {vis.open_ros && data.openROs && (
                <div>
                  {/* RO-specific date filter with "All Open" toggle */}
                  <div className="mb-3">
                    <DateRangeFilter
                      dateFrom={dateFrom}
                      dateTo={dateTo}
                      onChange={handleDateChange}
                      showAllOption
                      onShowAll={handleShowAllROs}
                      isShowingAll={showAllOpenROs}
                    />
                  </div>
                  <OpenROsCard data={data.openROs} />
                </div>
              )}

              {/* Quick Actions */}
              {vis.quick_actions && data.quickActions && (
                <QuickActionsCard permissions={data.quickActions} />
              )}
            </div>
          </div>

          {/* NOTE: Cash/Card breakdown and Total Customers have been moved.
              - Cash/Card → Reports > Payment Breakdown (feedback 1e)
              - Total Customers → Customers page header (feedback 1b)
              These are NOT deleted, just not on the dashboard anymore.
              See the reports route for where they live now. */}
        </>
      )}
    </div>
  );
}
