import { useEffect, useState, useCallback } from "react";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Save, Loader2, Plus, Trash2, Calendar, Clock } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
}

interface DaySchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface TimeOffEntry {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  user: { firstName: string; lastName: string } | null;
}

const DEFAULT_SCHEDULE: DaySchedule[] = DAYS.map((_, i) => ({
  dayOfWeek: i,
  startTime: "08:00",
  endTime: "17:00",
  isAvailable: i >= 1 && i <= 5,
}));

export default function AutoStaffAvailability() {
  const { autoFetch, user } = useAutoAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [timeOffEntries, setTimeOffEntries] = useState<TimeOffEntry[]>([]);
  const [timeOffLoading, setTimeOffLoading] = useState(false);
  const [addingTimeOff, setAddingTimeOff] = useState(false);
  const [newTimeOff, setNewTimeOff] = useState({
    userId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const canEdit = ["owner", "manager"].includes(user?.role || "");

  const fetchStaff = useCallback(async () => {
    try {
      const res = await autoFetch("/api/auto/users");
      const data = await res.json();
      setStaffList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [autoFetch]);

  const fetchSchedule = useCallback(
    async (userId: string) => {
      if (!userId) return;
      setScheduleLoading(true);
      try {
        const res = await autoFetch(`/api/auto/staff/availability/${userId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.schedule && data.schedule.length > 0) {
            setSchedule(data.schedule);
          } else {
            setSchedule(DEFAULT_SCHEDULE);
          }
        } else {
          setSchedule(DEFAULT_SCHEDULE);
        }
      } catch (err) {
        console.error(err);
        setSchedule(DEFAULT_SCHEDULE);
      } finally {
        setScheduleLoading(false);
      }
    },
    [autoFetch]
  );

  const fetchTimeOff = useCallback(async () => {
    setTimeOffLoading(true);
    try {
      const res = await autoFetch("/api/auto/staff/time-off");
      if (res.ok) {
        setTimeOffEntries(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeOffLoading(false);
    }
  }, [autoFetch]);

  useEffect(() => {
    fetchStaff();
    fetchTimeOff();
  }, [fetchStaff, fetchTimeOff]);

  useEffect(() => {
    if (selectedUserId) {
      fetchSchedule(selectedUserId);
    }
  }, [selectedUserId, fetchSchedule]);

  const handleScheduleChange = (dayIndex: number, field: keyof DaySchedule, value: any) => {
    setSchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === dayIndex ? { ...d, [field]: value } : d))
    );
  };

  const handleSaveSchedule = async () => {
    if (!selectedUserId) return;
    setSavingSchedule(true);
    try {
      const res = await autoFetch(`/api/auto/staff/availability/${selectedUserId}`, {
        method: "PUT",
        body: JSON.stringify({ schedule }),
      });
      if (!res.ok) throw new Error("Failed to save schedule");
      toast({ title: "Schedule saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleAddTimeOff = async () => {
    if (!newTimeOff.userId || !newTimeOff.startDate || !newTimeOff.endDate) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setAddingTimeOff(true);
    try {
      const res = await autoFetch("/api/auto/staff/time-off", {
        method: "POST",
        body: JSON.stringify({
          userId: parseInt(newTimeOff.userId),
          startDate: newTimeOff.startDate,
          endDate: newTimeOff.endDate,
          reason: newTimeOff.reason || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add time off");
      toast({ title: "Time off added" });
      setNewTimeOff({ userId: "", startDate: "", endDate: "", reason: "" });
      fetchTimeOff();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingTimeOff(false);
    }
  };

  const handleDeleteTimeOff = async (id: number) => {
    try {
      const res = await autoFetch(`/api/auto/staff/time-off/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setTimeOffEntries((prev) => prev.filter((e) => e.id !== id));
      toast({ title: "Time off removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <AutoLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AutoLayout>
    );
  }

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <h1
          className="text-xl font-bold flex items-center gap-2"
          data-testid="text-staff-avail-title"
        >
          <Users className="h-5 w-5" /> Staff Availability
        </h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Weekly Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Staff Member</Label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                data-testid="select-staff-member"
              >
                <SelectTrigger data-testid="select-staff-member">
                  <SelectValue placeholder="Choose a staff member..." />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.firstName} {s.lastName} ({s.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUserId && scheduleLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {selectedUserId && !scheduleLoading && (
              <>
                <div className="space-y-2">
                  {schedule.map((day) => (
                    <div
                      key={day.dayOfWeek}
                      className="flex items-center gap-3 border rounded-md p-3 flex-wrap"
                    >
                      <div className="flex items-center gap-2 w-28">
                        <Switch
                          checked={day.isAvailable}
                          onCheckedChange={(checked) =>
                            handleScheduleChange(day.dayOfWeek, "isAvailable", checked)
                          }
                          disabled={!canEdit}
                          data-testid={`switch-day-${day.dayOfWeek}`}
                        />
                        <span className="text-sm font-medium">{DAYS[day.dayOfWeek]}</span>
                      </div>
                      {day.isAvailable && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Input
                            type="time"
                            value={day.startTime}
                            onChange={(e) =>
                              handleScheduleChange(day.dayOfWeek, "startTime", e.target.value)
                            }
                            disabled={!canEdit}
                            className="w-32"
                            data-testid={`input-start-${day.dayOfWeek}`}
                          />
                          <span className="text-sm text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={day.endTime}
                            onChange={(e) =>
                              handleScheduleChange(day.dayOfWeek, "endTime", e.target.value)
                            }
                            disabled={!canEdit}
                            className="w-32"
                            data-testid={`input-end-${day.dayOfWeek}`}
                          />
                        </div>
                      )}
                      {!day.isAvailable && (
                        <Badge variant="secondary" className="text-xs">Off</Badge>
                      )}
                    </div>
                  ))}
                </div>
                {canEdit && (
                  <Button
                    onClick={handleSaveSchedule}
                    disabled={savingSchedule}
                    data-testid="button-save-schedule"
                  >
                    {savingSchedule ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Schedule
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Time Off
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canEdit && (
              <div className="border rounded-md p-3 space-y-3">
                <Label className="text-sm font-medium">Add Time Off</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Staff Member</Label>
                    <Select
                      value={newTimeOff.userId}
                      onValueChange={(v) => setNewTimeOff((prev) => ({ ...prev, userId: v }))}
                    >
                      <SelectTrigger data-testid="select-time-off-staff">
                        <SelectValue placeholder="Select staff..." />
                      </SelectTrigger>
                      <SelectContent>
                        {staffList.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.firstName} {s.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Reason (optional)</Label>
                    <Input
                      value={newTimeOff.reason}
                      onChange={(e) => setNewTimeOff((prev) => ({ ...prev, reason: e.target.value }))}
                      placeholder="Vacation, sick leave, etc."
                      data-testid="input-time-off-reason"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <Input
                      type="date"
                      value={newTimeOff.startDate}
                      onChange={(e) => setNewTimeOff((prev) => ({ ...prev, startDate: e.target.value }))}
                      data-testid="input-time-off-start"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <Input
                      type="date"
                      value={newTimeOff.endDate}
                      onChange={(e) => setNewTimeOff((prev) => ({ ...prev, endDate: e.target.value }))}
                      data-testid="input-time-off-end"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddTimeOff}
                  disabled={addingTimeOff}
                  data-testid="button-add-time-off"
                >
                  {addingTimeOff ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Time Off
                </Button>
              </div>
            )}

            {timeOffLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : timeOffEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No time off entries scheduled.
              </p>
            ) : (
              <div className="space-y-2">
                {timeOffEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 border rounded-md p-3 flex-wrap"
                    data-testid={`row-time-off-${entry.id}`}
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {entry.user
                          ? `${entry.user.firstName} ${entry.user.lastName}`
                          : `Staff #${entry.userId}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.startDate} to {entry.endDate}
                        {entry.reason && ` - ${entry.reason}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{entry.status}</Badge>
                      {canEdit && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteTimeOff(entry.id)}
                          data-testid={`button-delete-time-off-${entry.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AutoLayout>
  );
}
