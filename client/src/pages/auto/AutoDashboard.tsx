import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Calendar, DollarSign, Plus, ClipboardCheck, Phone, MessageSquare, Clock } from "lucide-react";
import { AutoLayout } from "./AutoLayout";
import { handleCall, handleSms, SMS_TEMPLATES } from "@/lib/auto-communication";
import CopyMessageModal from "@/components/auto/CopyMessageModal";

interface DashboardStats {
  totalRepairOrders: number;
  openRepairOrders: number;
  totalCustomers: number;
  todayAppointments: number;
  monthRevenue: number;
}

interface DashboardAppointment {
  id: number;
  title: string;
  description: string | null;
  status: string;
  startTime: string;
  endTime: string;
  customer?: { id?: number; firstName: string; lastName: string; phone?: string | null } | null;
  vehicle?: { year: number | null; make: string | null; model: string | null } | null;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function AutoDashboard() {
  const { autoFetch, user } = useAutoAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayApts, setTodayApts] = useState<DashboardAppointment[]>([]);
  const [smsModal, setSmsModal] = useState<{ phone: string; message: string } | null>(null);

  useEffect(() => {
    autoFetch("/api/auto/dashboard/stats")
      .then((res) => res.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));

    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    autoFetch(`/api/auto/appointments?start=${dayStart.toISOString()}&end=${dayEnd.toISOString()}`)
      .then((res) => res.json())
      .then((apts: DashboardAppointment[]) => {
        setTodayApts(apts.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
      })
      .catch(console.error);
  }, [autoFetch]);

  const statCards = [
    { label: "Open ROs", value: stats?.openRepairOrders ?? 0, icon: FileText, color: "text-blue-500", href: "/auto/repair-orders" },
    { label: "Total Customers", value: stats?.totalCustomers ?? 0, icon: Users, color: "text-green-500", href: "/auto/customers" },
    { label: "Today's Appointments", value: stats?.todayAppointments ?? 0, icon: Calendar, color: "text-purple-500", href: "/auto/schedule" },
    { label: "Revenue (Month)", value: `$${(stats?.monthRevenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-emerald-500", href: "#" },
  ];

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">
              Welcome back, {user?.firstName}
            </h1>
            <p className="text-sm text-muted-foreground">Here's what's happening at your shop today</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/auto/repair-orders/new">
              <Button className="gap-2" data-testid="button-new-ro">
                <Plus className="h-4 w-4" />
                New Repair Order
              </Button>
            </Link>
            <Link href="/auto/customers/new">
              <Button variant="outline" className="gap-2" data-testid="button-new-customer">
                <Users className="h-4 w-4" />
                New Customer
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {statCards.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card className="hover-elevate cursor-pointer" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold">{loading ? "..." : stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/auto/repair-orders/new">
                <Button variant="outline" className="w-full justify-start gap-3" data-testid="quick-new-ro">
                  <FileText className="h-4 w-4" />
                  Create New Estimate
                </Button>
              </Link>
              <Link href="/auto/customers/new">
                <Button variant="outline" className="w-full justify-start gap-3" data-testid="quick-new-customer">
                  <Users className="h-4 w-4" />
                  Add New Customer
                </Button>
              </Link>
              <Link href="/auto/schedule">
                <Button variant="outline" className="w-full justify-start gap-3" data-testid="quick-schedule">
                  <Calendar className="h-4 w-4" />
                  View Schedule
                </Button>
              </Link>
              <Link href="/auto/inspections">
                <Button variant="outline" className="w-full justify-start gap-3" data-testid="quick-dvi">
                  <ClipboardCheck className="h-4 w-4" />
                  Start Inspection
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base">Shop Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Repair Orders</span>
                <span className="font-medium" data-testid="text-total-ros">{loading ? "..." : stats?.totalRepairOrders ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Open Orders</span>
                <span className="font-medium">{loading ? "..." : stats?.openRepairOrders ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Monthly Revenue</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  ${loading ? "..." : (stats?.monthRevenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {todayApts.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base">Today's Appointments</CardTitle>
              <Link href="/auto/schedule">
                <Button variant="ghost" size="sm" data-testid="button-view-all-apts">View All</Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {todayApts.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-3 group"
                  data-testid={`dashboard-apt-${apt.id}`}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-medium truncate">{apt.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
                      </span>
                      {apt.customer && (
                        <span>{apt.customer.firstName} {apt.customer.lastName}</span>
                      )}
                      {apt.vehicle && (apt.vehicle.year || apt.vehicle.make || apt.vehicle.model) && (
                        <span>{[apt.vehicle.year, apt.vehicle.make, apt.vehicle.model].filter(Boolean).join(" ")}</span>
                      )}
                    </div>
                  </div>
                  {apt.customer?.phone && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="invisible group-hover:visible"
                        onClick={(e) => {
                          e.stopPropagation();
                          const token = localStorage.getItem("pcb_auto_token") || "";
                          handleCall(apt.customer!.phone!, apt.customer!.id || 0, token);
                        }}
                        data-testid={`button-call-dashboard-apt-${apt.id}`}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="invisible group-hover:visible"
                        onClick={(e) => {
                          e.stopPropagation();
                          const token = localStorage.getItem("pcb_auto_token") || "";
                          const customerName = `${apt.customer!.firstName} ${apt.customer!.lastName}`;
                          const msg = apt.description
                            ? SMS_TEMPLATES.appointmentReminder(
                                "Demo Auto Shop",
                                customerName,
                                new Date(apt.startTime).toLocaleDateString(),
                                formatTime(apt.startTime),
                                apt.description
                              )
                            : SMS_TEMPLATES.general("Demo Auto Shop", customerName);
                          const result = handleSms(apt.customer!.phone!, msg, apt.customer!.id || 0, token);
                          if (!result.isMobile) {
                            setSmsModal({ phone: result.phone, message: result.body });
                          }
                        }}
                        data-testid={`button-text-dashboard-apt-${apt.id}`}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
      <CopyMessageModal
        open={!!smsModal}
        onOpenChange={(open) => { if (!open) setSmsModal(null); }}
        phone={smsModal?.phone || ""}
        message={smsModal?.message || ""}
      />
    </AutoLayout>
  );
}
