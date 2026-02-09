/**
 * PCB Auto — Enhanced Dashboard Hooks
 * 
 * TanStack Query hooks for the enhanced dashboard.
 * Add to your client/hooks/ directory.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── Types ───

export interface DateRange {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
}

export interface DashboardVisibility {
  [cardKey: string]: boolean;
}

export interface VisibilitySettings {
  [role: string]: DashboardVisibility;
}

export interface BayCapacity {
  id: string;
  bay_number: string;
  name: string;
  sellable_hours_per_day: string;
  hours_booked: string;
  hours_available: string;
  appointment_count: string;
}

export interface AppointmentsAvailability {
  bays: BayCapacity[];
  totalScheduled: number;
  totalSellableHours: number;
  totalHoursBooked: number;
  totalHoursAvailable: number;
  utilization: number;
}

export interface OpenROItem {
  id: string;
  ro_number: number;
  status: string;
  created_at: string;
  total_card_price: string;
  total_cash_price: string;
  assigned_tech_id: string | null;
  customer_first: string;
  customer_last: string;
  vehicle_year: number;
  vehicle_make: string;
  vehicle_model: string;
}

export interface ShopStats {
  staffOff: Array<{
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    reason: string;
  }>;
  hoursSold: number;
  pendingApprovals: number;
}

export interface EnhancedDashboardData {
  visibility: DashboardVisibility;
  revenue?: {
    cash_total: string;
    card_total: string;
    total_revenue: string;
    payment_count: string;
  };
  carsInShop?: {
    in_progress: string;
    waiting: string;
    total: string;
  };
  aro?: {
    avg_repair_order: string;
    ro_count: string;
  };
  approvalRate?: {
    approved_count: string;
    sent_count: string;
    approval_rate: string;
  };
  feesSaved?: {
    fees_saved: string;
    card_volume: string;
  };
  appointmentsAvailability?: AppointmentsAvailability;
  openROs?: {
    items: OpenROItem[];
    totalOpen: number;
    showingAll: boolean;
  };
  shopStats?: ShopStats;
  quickActions?: {
    canCreateRO: boolean;
    canSearchCustomer: boolean;
    canEditCustomer: boolean;
    canCreateAppointment: boolean;
  };
}

export interface StaffAvailabilityEntry {
  id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
  first_name: string;
  last_name: string;
  role: string;
}

export interface StaffTimeOffEntry {
  id: string;
  employee_id: string;
  date: string;
  reason: string | null;
  is_full_day: boolean;
  first_name: string;
  last_name: string;
  role: string;
}

// ─── API Helpers ───

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function putJson<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function postJson<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function deleteJson(url: string): Promise<void> {
  const res = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

// ─── Hooks ───

/**
 * Main enhanced dashboard data hook
 */
export function useEnhancedDashboard(dateRange: DateRange, showAllOpenROs = false) {
  const params = new URLSearchParams({
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
    ...(showAllOpenROs ? { showAllOpen: "true" } : {}),
  });

  return useQuery<EnhancedDashboardData>({
    queryKey: ["dashboard-enhanced", dateRange.dateFrom, dateRange.dateTo, showAllOpenROs],
    queryFn: () => fetchJson(`/api/dashboard/enhanced?${params}`),
    refetchInterval: 30_000, // refresh every 30s
    staleTime: 10_000,
  });
}

/**
 * Dashboard visibility settings (for settings page)
 */
export function useDashboardVisibility() {
  return useQuery<{ settings: VisibilitySettings; isDefault: boolean }>({
    queryKey: ["dashboard-visibility"],
    queryFn: () => fetchJson("/api/dashboard/visibility"),
  });
}

/**
 * Update dashboard visibility settings
 */
export function useUpdateDashboardVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: VisibilitySettings) =>
      putJson("/api/dashboard/visibility", { settings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-visibility"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-enhanced"] });
    },
  });
}

/**
 * Staff availability (weekly schedules)
 */
export function useStaffAvailability(employeeId?: string) {
  const params = employeeId ? `?employeeId=${employeeId}` : "";

  return useQuery<StaffAvailabilityEntry[]>({
    queryKey: ["staff-availability", employeeId],
    queryFn: () => fetchJson(`/api/staff/availability${params}`),
  });
}

/**
 * Update staff availability for an employee
 */
export function useUpdateStaffAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, schedule }: {
      employeeId: string;
      schedule: Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        isWorking: boolean;
      }>;
    }) => putJson(`/api/staff/availability/${employeeId}`, { schedule }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-availability"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-enhanced"] });
    },
  });
}

/**
 * Staff time off entries
 */
export function useStaffTimeOff(dateRange: DateRange) {
  const params = new URLSearchParams({
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });

  return useQuery<StaffTimeOffEntry[]>({
    queryKey: ["staff-time-off", dateRange.dateFrom, dateRange.dateTo],
    queryFn: () => fetchJson(`/api/staff/time-off?${params}`),
  });
}

/**
 * Add a time off entry
 */
export function useAddStaffTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      employeeId: string;
      date: string;
      reason?: string;
      isFullDay?: boolean;
      startTime?: string;
      endTime?: string;
    }) => postJson("/api/staff/time-off", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-time-off"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-enhanced"] });
    },
  });
}

/**
 * Delete a time off entry
 */
export function useDeleteStaffTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteJson(`/api/staff/time-off/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-time-off"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-enhanced"] });
    },
  });
}
