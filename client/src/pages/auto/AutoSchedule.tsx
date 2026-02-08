import { useEffect, useState, useCallback } from "react";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function AutoSchedule() {
  const { autoFetch } = useAutoAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bays, setBays] = useState<Bay[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", date: "", startTime: "09:00",
    endTime: "10:00", bayId: "", technicianId: "",
  });

  const dateStr = currentDate.toISOString().split("T")[0];
  const dayLabel = currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const fetchData = useCallback(async () => {
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

  useEffect(() => { fetchData(); }, [fetchData]);

  const prevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };
  const nextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };
  const goToday = () => setCurrentDate(new Date());

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
      setAppointments([...appointments, apt]);
      setDialogOpen(false);
      setForm({ title: "", description: "", date: "", startTime: "09:00", endTime: "10:00", bayId: "", technicianId: "" });
      toast({ title: "Appointment Created" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteAppointment = async (id: number) => {
    try {
      await autoFetch(`/api/auto/appointments/${id}`, { method: "DELETE" });
      setAppointments(appointments.filter(a => a.id !== id));
      toast({ title: "Appointment Deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const getAppointmentPosition = (apt: Appointment) => {
    const start = new Date(apt.startTime);
    const end = new Date(apt.endTime);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const top = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 30);
    return { top, height };
  };

  const getAppointmentColor = (apt: Appointment) => {
    if (apt.color) return apt.color;
    const colors = ["bg-blue-200 dark:bg-blue-800", "bg-green-200 dark:bg-green-800", "bg-purple-200 dark:bg-purple-800", "bg-orange-200 dark:bg-orange-800"];
    return colors[apt.id % colors.length];
  };

  const displayColumns = bays.length > 0 ? bays : [{ id: 0, name: "Schedule" }];

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
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

        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" size="icon" onClick={prevDay}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="text-center">
            <p className="font-medium text-sm" data-testid="text-current-date">{dayLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
            <Button variant="outline" size="icon" onClick={nextDay}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <div className="min-w-[600px]">
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
                        {HOURS.map(hour => (
                          <div key={hour} className="border-b" style={{ height: HOUR_HEIGHT }} />
                        ))}
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
                                      {new Date(apt.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
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
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Today's Appointments ({appointments.length})</CardTitle></CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments for this day</p>
            ) : (
              <div className="space-y-2">
                {appointments.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map(apt => (
                  <div key={apt.id} className="flex items-center justify-between gap-3 p-2 rounded-md border">
                    <div>
                      <p className="text-sm font-medium">{apt.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(apt.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} -
                        {new Date(apt.endTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        {apt.customer && ` | ${apt.customer.firstName} ${apt.customer.lastName}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteAppointment(apt.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
