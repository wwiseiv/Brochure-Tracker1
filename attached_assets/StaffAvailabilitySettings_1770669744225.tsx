/**
 * StaffAvailabilitySettings
 * 
 * Settings page for managing tech/advisor weekly schedules and time off.
 * This data powers the "Who's Off" widget and availability calculations.
 * 
 * Route: /settings/staff-availability
 * Required for: Shop Stats card (feedback 1g), Availability widget (feedback 1c)
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useStaffAvailability,
  useUpdateStaffAvailability,
  useStaffTimeOff,
  useAddStaffTimeOff,
  useDeleteStaffTimeOff,
  type StaffAvailabilityEntry,
} from "../../hooks/useDashboardEnhanced";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  active: boolean;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_ABBREV = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getThisWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(start.getDate() - day);
  const end = new Date(start);
  end.setDate(end.getDate() + 13); // Two weeks
  return {
    dateFrom: start.toISOString().split("T")[0],
    dateTo: end.toISOString().split("T")[0],
  };
}

export function StaffAvailabilitySettings() {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [timeOffDate, setTimeOffDate] = useState("");
  const [timeOffReason, setTimeOffReason] = useState("");

  // Fetch employees
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const res = await fetch("/api/employees", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load employees");
      return res.json();
    },
  });

  // Fetch availability
  const { data: availability } = useStaffAvailability(selectedEmployee || undefined);
  const updateAvailability = useUpdateStaffAvailability();

  // Fetch time off
  const weekRange = getThisWeekRange();
  const { data: timeOff } = useStaffTimeOff(weekRange);
  const addTimeOff = useAddStaffTimeOff();
  const deleteTimeOff = useDeleteStaffTimeOff();

  // Group availability by employee
  const groupedAvailability: Record<string, StaffAvailabilityEntry[]> = {};
  (availability || []).forEach((entry) => {
    const key = entry.employee_id;
    if (!groupedAvailability[key]) groupedAvailability[key] = [];
    groupedAvailability[key].push(entry);
  });

  // Handle schedule toggle
  const handleDayToggle = (employeeId: string, dayOfWeek: number, currentEntries: StaffAvailabilityEntry[]) => {
    const existing = currentEntries.find((e) => e.day_of_week === dayOfWeek);
    const schedule = DAYS.map((_, i) => {
      const entry = currentEntries.find((e) => e.day_of_week === i);
      if (i === dayOfWeek) {
        return {
          dayOfWeek: i,
          startTime: entry?.start_time || "08:00",
          endTime: entry?.end_time || "17:00",
          isWorking: !(entry?.is_working ?? (i >= 1 && i <= 5)), // toggle
        };
      }
      return {
        dayOfWeek: i,
        startTime: entry?.start_time || "08:00",
        endTime: entry?.end_time || "17:00",
        isWorking: entry?.is_working ?? (i >= 1 && i <= 5), // default: Mon-Fri
      };
    });

    updateAvailability.mutate({ employeeId, schedule });
  };

  // Handle time off
  const handleAddTimeOff = () => {
    if (!selectedEmployee || !timeOffDate) return;
    addTimeOff.mutate({
      employeeId: selectedEmployee,
      date: timeOffDate,
      reason: timeOffReason || undefined,
    });
    setTimeOffDate("");
    setTimeOffReason("");
    setShowTimeOffForm(false);
  };

  const activeEmployees = (employees || []).filter((e) => e.active);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Staff Availability</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set default working days for each team member and manage time off.
          This powers the "Who's Off" indicator and capacity calculations.
        </p>
      </div>

      {/* Employee selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedEmployee(null)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            !selectedEmployee
              ? "bg-[#1B3A6B] text-white"
              : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
          }`}
        >
          All Staff
        </button>
        {activeEmployees.map((emp) => (
          <button
            key={emp.id}
            onClick={() => setSelectedEmployee(emp.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedEmployee === emp.id
                ? "bg-[#1B3A6B] text-white"
                : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            {emp.first_name} {emp.last_name}
            <span className="text-[10px] ml-1 opacity-60 capitalize">
              ({emp.role.replace("_", " ")})
            </span>
          </button>
        ))}
      </div>

      {/* Weekly Schedule Grid */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Weekly Schedule
        </h2>

        {activeEmployees
          .filter((e) => !selectedEmployee || e.id === selectedEmployee)
          .map((emp) => {
            const entries = groupedAvailability[emp.id] || [];

            return (
              <div key={emp.id} className="mb-4 last:mb-0">
                <div className="text-sm font-medium text-white mb-2">
                  {emp.first_name} {emp.last_name}
                  <span className="text-xs text-gray-500 ml-2 capitalize">
                    {emp.role.replace("_", " ")}
                  </span>
                </div>

                <div className="flex gap-1.5">
                  {DAYS.map((day, i) => {
                    const entry = entries.find((e) => e.day_of_week === i);
                    const isWorking = entry?.is_working ?? (i >= 1 && i <= 5);

                    return (
                      <button
                        key={i}
                        onClick={() => handleDayToggle(emp.id, i, entries)}
                        className={`flex-1 py-2 rounded-lg text-center text-xs font-medium
                                    transition-colors ${
                          isWorking
                            ? "bg-green-500/20 text-green-400 border border-green-500/20"
                            : "bg-white/[0.03] text-gray-600 border border-white/[0.04]"
                        }`}
                        title={`${day}: ${isWorking ? "Working" : "Off"}`}
                      >
                        <div>{DAY_ABBREV[i]}</div>
                        {isWorking && entry && (
                          <div className="text-[9px] mt-0.5 opacity-70">
                            {entry.start_time?.slice(0, 5)}-{entry.end_time?.slice(0, 5)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

        {activeEmployees.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No active employees found. Add employees in Settings → Staff first.
          </div>
        )}
      </div>

      {/* Time Off Section */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Upcoming Time Off
          </h2>
          {selectedEmployee && (
            <button
              onClick={() => setShowTimeOffForm(!showTimeOffForm)}
              className="px-3 py-1.5 bg-[#D4782F] text-white text-xs font-medium rounded-lg
                         hover:bg-[#c06a25] transition-colors"
            >
              + Add Day Off
            </button>
          )}
        </div>

        {/* Add time off form */}
        {showTimeOffForm && selectedEmployee && (
          <div className="bg-white/[0.03] rounded-lg p-3 mb-4 border border-white/[0.04]">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Date</label>
                <input
                  type="date"
                  value={timeOffDate}
                  onChange={(e) => setTimeOffDate(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2
                             text-sm text-white focus:border-[#1B3A6B] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={timeOffReason}
                  onChange={(e) => setTimeOffReason(e.target.value)}
                  placeholder="Vacation, sick, etc."
                  className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2
                             text-sm text-white placeholder:text-gray-500
                             focus:border-[#1B3A6B] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddTimeOff}
                disabled={!timeOffDate || addTimeOff.isPending}
                className="px-4 py-2 bg-[#D4782F] text-white text-sm font-medium rounded-lg
                           hover:bg-[#c06a25] transition-colors disabled:opacity-50"
              >
                {addTimeOff.isPending ? "Adding..." : "Add"}
              </button>
              <button
                onClick={() => setShowTimeOffForm(false)}
                className="px-4 py-2 bg-white/5 text-gray-400 text-sm rounded-lg
                           hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Time off list */}
        {(timeOff || []).length > 0 ? (
          <div className="space-y-2">
            {(timeOff || []).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between bg-white/[0.02] rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center
                                  text-[10px] text-red-400 font-bold">
                    {entry.first_name.charAt(0)}{entry.last_name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm text-white">
                      {entry.first_name} {entry.last_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(entry.date + "T12:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {entry.reason && ` · ${entry.reason}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteTimeOff.mutate(entry.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors text-sm"
                  title="Remove time off"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-600 text-sm">
            No upcoming time off scheduled
          </div>
        )}

        {!selectedEmployee && (
          <div className="mt-3 text-xs text-gray-500">
            Select an employee above to add time off entries.
          </div>
        )}
      </div>
    </div>
  );
}
