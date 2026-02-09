/**
 * PCB Auto Dashboard Enhancements — Barrel Export
 * 
 * Import everything from one place:
 * import { EnhancedDashboard, DashboardVisibilitySettings, ... } from "./dashboard-enhancements";
 */

// ─── Dashboard Components ───
export { EnhancedDashboard } from "./client/components/dashboard/EnhancedDashboard";
export { DateRangeFilter } from "./client/components/dashboard/DateRangeFilter";
export { AppointmentsAvailabilityCard } from "./client/components/dashboard/AppointmentsAvailabilityCard";
export { OpenROsCard } from "./client/components/dashboard/OpenROsCard";
export { QuickActionsCard } from "./client/components/dashboard/QuickActionsCard";
export { ShopStatsCard } from "./client/components/dashboard/ShopStatsCard";

// ─── Settings Components ───
export { DashboardVisibilitySettings } from "./client/components/settings/DashboardVisibilitySettings";
export { BayConfigurationSettings } from "./client/components/settings/BayConfigurationSettings";
export { StaffAvailabilitySettings } from "./client/components/settings/StaffAvailabilitySettings";

// ─── Hooks ───
export {
  useEnhancedDashboard,
  useDashboardVisibility,
  useUpdateDashboardVisibility,
  useStaffAvailability,
  useUpdateStaffAvailability,
  useStaffTimeOff,
  useAddStaffTimeOff,
  useDeleteStaffTimeOff,
} from "./client/hooks/useDashboardEnhanced";

// ─── Types ───
export type {
  DateRange,
  DashboardVisibility,
  VisibilitySettings,
  BayCapacity,
  AppointmentsAvailability,
  OpenROItem,
  ShopStats,
  EnhancedDashboardData,
  StaffAvailabilityEntry,
  StaffTimeOffEntry,
} from "./client/hooks/useDashboardEnhanced";
