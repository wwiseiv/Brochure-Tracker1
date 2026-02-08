import { useEffect, useState, useCallback, useMemo } from "react";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, Loader2, Trash2, Users, Wrench, LayoutList, LayoutGrid } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DesktopNudge } from "./DesktopNudge";

interface Appointment {
  id: number;
  title: string;
  description: string | null;
  status: string;
  startTime: string;
  endTime: string;
  bayId: number | null;
  technicianId: number | null;
  customer?: { firstName: string; lastName: string } | null;
  vehicle?: { year: number | null; make: string | null; model: string | null } | null;
  color: string | null;
}

interface Bay { id: number; name: string; }
interface StaffMember { id: number; firstName: string; lastName: string; role: string; }

const HOUR_HEIGHT = 60;
const START_HOUR = 7;
const END_HOUR = 19;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getDuration(start: string, end: string) {
  const mins = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}`.trim() : `${m}m`;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    in_progress: { label: "In Progress", variant: "default" },
    scheduled: { label: "Scheduled", variant: "outline" },
    completed: { label: "Completed", variant: "secondary" },
    cancelled: { label: "Cancelled", variant: "destructive" },
  };
  const s = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
}

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

export default function AutoSchedule() {
  const { autoFetch } = useAutoAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [monthAppointments, setMonthAppointments] = useState<Appointment[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bays, setBays] = useState<Bay[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", date: "", startTime: "09:00",
    endTime: "10:00", bayId: "", technicianId: "",
  });

  const dateStr = selectedDate.toISOString().split("T")[0];
  const dayLabel = selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const today = useMemo(() => new Date(), []);

  const fetchDayData = useCallback(async () => {
    setLoading(true);
    try {
      const dayStart = new Date(dateStr + "T00:00:00");
      const dayEnd = new Date(dateStr + "T23:59:59");
      const [aptsRes, baysRes, staffRes] = await Promise.all([
        autoFetch(`/api/auto/appointments?start=${dayStart.toISOString()}&end=${dayEnd.toISOString()}`),
        autoFetch("/api/auto/bays"),
        autoFetch("/api/auto/staff"),
      ]);
      setAppointments(await aptsRes.json());
      setBays(await baysRes.json());
      const staffData = await staffRes.json();
      setStaff(staffData.users || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [autoFetch, dateStr]);

  const fetchMonthData = useCallback(async () => {
    try {
      const y = calendarMonth.getFullYear();
      const m = calendarMonth.getMonth();
      const monthStart = new Date(y, m, 1);
      const monthEnd = new Date(y, m + 1, 0, 23, 59, 59);
      const res = await autoFetch(`/api/auto/appointments?start=${monthStart.toISOString()}&end=${monthEnd.toISOString()}`);
      setMonthAppointments(await res.json());
    } catch (err) { console.error(err); }
  }, [autoFetch, calendarMonth]);

  useEffect(() => { fetchDayData(); }, [fetchDayData]);
  useEffect(() => { fetchMonthData(); }, [fetchMonthData]);

  const daysWithAppointments = useMemo(() => {
    const set = new Set<string>();
    monthAppointments.forEach(a => {
      const d = new Date(a.startTime).toISOString().split("T")[0];
      set.add(d);
    });
    return set;
  }, [monthAppointments]);

  const techsWithAppointments = useMemo(() => {
    const set = new Set<number>();
    appointments.forEach(a => { if (a.technicianId) set.add(a.technicianId); });
    return set;
  }, [appointments]);

  const technicians = useMemo(() => staff.filter(s => s.role === "technician"), [staff]);

  const activeBays = useMemo(() => {
    const set = new Set<number>();
    appointments.forEach(a => { if (a.bayId) set.add(a.bayId); });
    return set.size;
  }, [appointments]);

  const sortedAppointments = useMemo(() =>
    [...appointments].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
  [appointments]);

  const prevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); };
  const nextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); };

  const handleCreate = async () => {
    if (!form.title) return;
    try {
      const startTime = new Date(`${form.date || dateStr}T${form.startTime}:00`);
      const endTime = new Date(`${form.date || dateStr}T${form.endTime}:00`);
      const res = await autoFetch("/api/auto/appointments", {
        method: "POST",
        body: JSON.stringify({
          title: form.title, description: form.description,
          startTime: startTime.toISOString(), endTime: endTime.toISOString(),
          bayId: form.bayId ? parseInt(form.bayId) : null,
          technicianId: form.technicianId ? parseInt(form.technicianId) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const apt = await res.json();
      setAppointments(prev => [...prev, apt]);
      setDialogOpen(false);
      setForm({ title: "", description: "", date: "", startTime: "09:00", endTime: "10:00", bayId: "", technicianId: "" });
      toast({ title: "Appointment Created" });
      fetchMonthData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteAppointment = async (id: number) => {
    try {
      await autoFetch(`/api/auto/appointments/${id}`, { method: "DELETE" });
      setAppointments(prev => prev.filter(a => a.id !== id));
      toast({ title: "Appointment Deleted" });
      fetchMonthData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const getAppointmentPosition = (apt: Appointment) => {
    const start = new Date(apt.startTime);
    const end = new Date(apt.endTime);
    const top = ((start.getHours() * 60 + start.getMinutes()) - START_HOUR * 60) / 60 * HOUR_HEIGHT;
    const height = Math.max(((end.getHours() * 60 + end.getMinutes()) - (start.getHours() * 60 + start.getMinutes())) / 60 * HOUR_HEIGHT, 30);
    return { top, height };
  };

  const getAppointmentColor = (apt: Appointment) => {
    if (apt.color) return apt.color;
    const colors = ["bg-blue-200 dark:bg-blue-800", "bg-green-200 dark:bg-green-800", "bg-purple-200 dark:bg-purple-800", "bg-orange-200 dark:bg-orange-800"];
    return colors[apt.id % colors.length];
  };

  const getTechName = (techId: number | null) => {
    if (!techId) return null;
    const t = staff.find(s => s.id === techId);
    return t ? `${t.firstName} ${t.lastName[0]}.` : null;
  };

  const getBayName = (bayId: number | null) => {
    if (!bayId) return null;
    return bays.find(b => b.id === bayId)?.name || null;
  };

  const calDays = useMemo(() => getCalendarDays(calendarMonth.getFullYear(), calendarMonth.getMonth()), [calendarMonth]);
  const monthLabel = calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const mobileWeekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [today]);

  const displayColumns = bays.length > 0 ? bays : [{ id: 0, name: "Schedule" }];

  const openSlots = useMemo(() => {
    return bays.map(bay => {
      const bayApts = appointments.filter(a => a.bayId === bay.id);
      const totalMins = bayApts.reduce((sum, a) => {
        return sum + (new Date(a.endTime).getTime() - new Date(a.startTime).getTime()) / 60000;
      }, 0);
      const totalAvailable = (END_HOUR - START_HOUR) * 60;
      const freeHours = Math.round((totalAvailable - totalMins) / 60 * 10) / 10;
      return { bay: bay.name, freeHours: Math.max(freeHours, 0) };
    });
  }, [bays, appointments]);

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-schedule-title">
            <Calendar className="h-5 w-5" /> Schedule
          </h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-new-apt">
                <Plus className="h-4 w-4" /> New Appointment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Appointment</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="input-apt-title" /></div>
                <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date || dateStr} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Start Time</Label><Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
                  <div className="space-y-2"><Label>End Time</Label><Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Bay</Label>
                  <Select value={form.bayId} onValueChange={(v) => setForm({ ...form, bayId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select bay" /></SelectTrigger>
                    <SelectContent>{bays.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Technician</Label>
                  <Select value={form.technicianId} onValueChange={(v) => setForm({ ...form, technicianId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select tech" /></SelectTrigger>
                    <SelectContent>{staff.filter(s => s.role === "technician" || s.role === "owner").map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleCreate} data-testid="button-save-apt">Create Appointment</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <DesktopNudge message="The bay grid view works best on a tablet or desktop." dismissKey="schedule-grid" />

        {/* Mobile date navigation header */}
        <div className="sm:hidden flex items-center justify-between gap-2 px-1 mb-2">
          <Button variant="ghost" size="icon" onClick={prevDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
          <Button variant="ghost" size="icon" onClick={nextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile date picker bar */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto pb-2">
          {mobileWeekDays.map((d) => {
            const ds = d.toISOString().split("T")[0];
            const isSelected = isSameDay(d, selectedDate);
            const hasDot = daysWithAppointments.has(ds);
            return (
              <button
                key={ds}
                onClick={() => setSelectedDate(new Date(d))}
                className={`flex flex-col items-center px-3 py-2 rounded-md min-w-[48px] ${isSelected ? "bg-primary text-primary-foreground" : ""}`}
              >
                <span className="text-[10px] uppercase">{WEEKDAYS[d.getDay()]}</span>
                <span className="text-sm font-medium">{d.getDate()}</span>
                {hasDot && <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />}
              </button>
            );
          })}
        </div>

        <div className="flex gap-4">
          {/* Left sidebar - desktop only */}
          <div className="hidden lg:flex flex-col gap-4 w-60 shrink-0">
            {/* Mini Calendar */}
            <Card data-testid="mini-calendar">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} data-testid="button-prev-month">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-medium" data-testid="text-current-month">{monthLabel}</span>
                  <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} data-testid="button-next-month">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-0 text-center">
                  {WEEKDAYS.map(d => <div key={d} className="text-[10px] text-muted-foreground py-1">{d}</div>)}
                  {calDays.map((day, i) => {
                    if (!day) return <div key={`e-${i}`} />;
                    const ds = day.toISOString().split("T")[0];
                    const isToday = isSameDay(day, today);
                    const isSelected = isSameDay(day, selectedDate);
                    const hasDot = daysWithAppointments.has(ds);
                    return (
                      <button
                        key={ds}
                        onClick={() => setSelectedDate(new Date(day))}
                        className="flex flex-col items-center py-0.5"
                      >
                        <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full
                          ${isToday ? "bg-primary text-primary-foreground" : ""}
                          ${isSelected && !isToday ? "ring-2 ring-primary" : ""}
                        `}>
                          {day.getDate()}
                        </span>
                        <span className={`w-1 h-1 rounded-full ${hasDot ? "bg-primary" : "bg-transparent"}`} />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Technicians Panel */}
            <Card data-testid="panel-technicians">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Technicians</span>
                </div>
                {technicians.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No technicians found</p>
                ) : (
                  <div className="space-y-2">
                    {technicians.map(tech => (
                      <div key={tech.id} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${techsWithAppointments.has(tech.id) ? "bg-green-500" : "bg-gray-400"}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{tech.firstName} {tech.lastName[0]}.</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{tech.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* View Toggle */}
            <Button
              variant="outline"
              className="gap-2 w-full"
              onClick={() => setViewMode(v => v === "list" ? "grid" : "list")}
              data-testid="button-view-toggle"
            >
              {viewMode === "list" ? <><LayoutGrid className="h-4 w-4" /> Show Grid View</> : <><LayoutList className="h-4 w-4" /> Show List View</>}
            </Button>
          </div>

          {/* Right panel */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : viewMode === "list" ? (
              <div data-testid="section-appointments-list" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={prevDay}><ChevronLeft className="h-4 w-4" /></Button>
                    <div>
                      <p className="text-sm font-medium" data-testid="text-date-label">{dayLabel}</p>
                      <p className="text-xs text-muted-foreground" data-testid="text-appointment-count">
                        {appointments.length} appointment{appointments.length !== 1 ? "s" : ""} · {activeBays} bay{activeBays !== 1 ? "s" : ""} active
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={nextDay}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>

                {sortedAppointments.length === 0 ? (
                  <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No appointments for this day</CardContent></Card>
                ) : (
                  <div className="space-y-2">
                    {sortedAppointments.map(apt => (
                      <Card key={apt.id} className="hover-elevate overflow-visible" data-testid={`card-appointment-${apt.id}`}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2 group">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium">{apt.title}</span>
                                {statusBadge(apt.status)}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(apt.startTime)} - {formatTime(apt.endTime)}</span>
                                <span>{getDuration(apt.startTime, apt.endTime)}</span>
                                {getBayName(apt.bayId) && <span className="flex items-center gap-1"><Wrench className="h-3 w-3" />{getBayName(apt.bayId)}</span>}
                                {getTechName(apt.technicianId) && <span>{getTechName(apt.technicianId)}</span>}
                              </div>
                              {apt.customer && <p className="text-xs">{apt.customer.firstName} {apt.customer.lastName}</p>}
                              {apt.vehicle && (apt.vehicle.year || apt.vehicle.make || apt.vehicle.model) && (
                                <p className="text-xs text-muted-foreground">{[apt.vehicle.year, apt.vehicle.make, apt.vehicle.model].filter(Boolean).join(" ")}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 invisible group-hover:visible"
                              onClick={() => deleteAppointment(apt.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {bays.length > 0 && (
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs font-medium mb-2">Open Slots</p>
                      <div className="flex flex-wrap gap-2">
                        {openSlots.map(s => (
                          <Badge key={s.bay} variant="secondary" className="text-[10px]">{s.bay}: {s.freeHours}h free</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div data-testid="section-appointments-grid" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={prevDay}><ChevronLeft className="h-4 w-4" /></Button>
                    <p className="text-sm font-medium" data-testid="text-current-date">{dayLabel}</p>
                    <Button variant="ghost" size="icon" onClick={nextDay}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <div className="min-w-[500px]">
                      <div className="grid border-b bg-muted/50" style={{ gridTemplateColumns: `60px repeat(${displayColumns.length}, 1fr)` }}>
                        <div className="p-2 text-xs text-muted-foreground border-r">Time</div>
                        {displayColumns.map(col => (
                          <div key={col.id} className="p-2 text-xs font-medium text-center border-r last:border-r-0">{col.name}</div>
                        ))}
                      </div>
                      <div className="relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
                        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `60px repeat(${displayColumns.length}, 1fr)` }}>
                          <div className="border-r">
                            {HOURS.map(hour => (
                              <div key={hour} className="border-b text-xs text-muted-foreground px-2 flex items-start pt-1" style={{ height: HOUR_HEIGHT }}>
                                {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                              </div>
                            ))}
                          </div>
                          {displayColumns.map(col => (
                            <div key={col.id} className="border-r last:border-r-0 relative">
                              {HOURS.map(hour => <div key={hour} className="border-b" style={{ height: HOUR_HEIGHT }} />)}
                              {appointments
                                .filter(apt => col.id === 0 || apt.bayId === col.id)
                                .map(apt => {
                                  const { top, height } = getAppointmentPosition(apt);
                                  return (
                                    <div
                                      key={apt.id}
                                      className={`absolute left-1 right-1 rounded-md p-1 text-xs overflow-hidden cursor-pointer group ${getAppointmentColor(apt)}`}
                                      style={{ top, height, minHeight: 30 }}
                                      data-testid={`apt-${apt.id}`}
                                    >
                                      <div className="flex items-start justify-between gap-1">
                                        <div className="min-w-0">
                                          <p className="font-medium truncate">{apt.title}</p>
                                          {apt.customer && <p className="truncate text-[10px] opacity-80">{apt.customer.firstName} {apt.customer.lastName}</p>}
                                          <p className="text-[10px] opacity-70 flex items-center gap-1">
                                            <Clock className="h-2.5 w-2.5" />
                                            {formatTime(apt.startTime)}
                                          </p>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5 invisible group-hover:visible shrink-0"
                                          onClick={(e) => { e.stopPropagation(); deleteAppointment(apt.id); }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </AutoLayout>
  );
}