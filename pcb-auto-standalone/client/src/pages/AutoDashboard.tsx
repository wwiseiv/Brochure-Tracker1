import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DollarSign, TrendingUp, CheckCircle, ShieldCheck,
  FileText, Users, Calendar, Plus, ClipboardCheck,
  Phone, MessageSquare, Clock, Loader2, ArrowRight,
  Wrench, UserCheck, AlertCircle, Timer, TrendingDown
} from "lucide-react";
import { AutoLayout } from "./AutoLayout";
import { handleCall, handleSms, SMS_TEMPLATES } from "@/lib/auto-communication";
import CopyMessageModal from "@/components/auto/CopyMessageModal";

interface EnhancedDashboardData {
  todayRevenue: number;
  monthRevenue: number;
  carsInShop: number;
  aro: number;
  approvalRate: number;
  feesSaved: number;
  openROs: Array<{
    id: number;
    roNumber: string;
    status: string;
    totalCash: string;
    totalCard: string;
    createdAt: string;
    customer: { firstName: string; lastName: string } | null;
    vehicle: { year: number | null; make: string | null; model: string | null } | null;
  }>;
  bayCapacity: {
    totalBays: number;
    totalSellableHours: number;
    bookedHours: number;
    availableHours: number;
  };
  appointments: Array<{
    id: number;
    title: string;
    description: string | null;
    status: string;
    startTime: string;
    endTime: string;
    customer?: { id?: number; firstName: string; lastName: string; phone?: string | null } | null;
    vehicle?: { year: number | null; make: string | null; model: string | null } | null;
  }>;
  staffOnDuty: Array<{ id: number; firstName: string; lastName: string; role: string }>;
  totalCustomers: number;
  visibility: Record<string, boolean>;
}

interface ActiveTechSession {
  session: {
    id: number;
    clockIn: string;
    clockOut: string | null;
    isActive: boolean;
  };
  techFirstName: string;
  techLastName: string;
  roNumber: string;
  serviceDescription: string;
}

function formatElapsedTime(clockIn: string): string {
  const start = new Date(clockIn).getTime();
  const now = Date.now();
  const diffMs = now - start;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "estimate":
      return "secondary";
    case "approved":
      return "default";
    case "in_progress":
      return "outline";
    default:
      return "secondary";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "estimate":
      return "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30";
    case "approved":
      return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30";
    case "in_progress":
      return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30";
    default:
      return "";
  }
}

interface AddOnMetrics {
  presented: number;
  approved: number;
  declined: number;
  pending: number;
  approvalRate: number;
}

export default function AutoDashboard() {
  const { autoFetch, user } = useAutoAuth();
  const [data, setData] = useState<EnhancedDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [smsModal, setSmsModal] = useState<{ phone: string; message: string } | null>(null);
  const [techSessions, setTechSessions] = useState<ActiveTechSession[]>([]);
  const [techSessionsLoading, setTechSessionsLoading] = useState(true);
  const [addOnMetrics, setAddOnMetrics] = useState<AddOnMetrics | null>(null);
  const [addOnLoading, setAddOnLoading] = useState(true);

  const fetchAddOnMetrics = useCallback(() => {
    setAddOnLoading(true);
    const today = new Date();
    const from = today.toISOString().split("T")[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const to = tomorrow.toISOString().split("T")[0];

    autoFetch(`/api/repair-orders?from=${from}&to=${to}&includeLineItems=true`)
      .then((res) => res.json())
      .then((d) => {
        const ros = d.repairOrders || d || [];
        let presented = 0;
        let approved = 0;
        let declined = 0;
        let pending = 0;

        for (const ro of ros) {
          const items = ro.lineItems || [];
          for (const item of items) {
            if (item.lineOrigin === "addon" || item.lineOrigin === "inspection") {
              presented++;
              if (item.approvalStatus === "approved") approved++;
              else if (item.approvalStatus === "declined") declined++;
              else pending++;
            }
          }
        }

        const rate = presented > 0 ? Math.round((approved / presented) * 100) : 0;
        setAddOnMetrics({ presented, approved, declined, pending, approvalRate: rate });
      })
      .catch(() => {
        setAddOnMetrics({ presented: 0, approved: 0, declined: 0, pending: 0, approvalRate: 0 });
      })
      .finally(() => setAddOnLoading(false));
  }, [autoFetch]);

  const fetchTechSessions = useCallback(() => {
    setTechSessionsLoading(true);
    autoFetch("/api/tech-sessions/active")
      .then((res) => res.json())
      .then((d) => setTechSessions(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setTechSessionsLoading(false));
  }, [autoFetch]);

  const fetchDashboard = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const qs = params.toString();
    const url = `/api/dashboard/enhanced${qs ? `?${qs}` : ""}`;

    autoFetch(url)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [autoFetch, startDate, endDate]);

  useEffect(() => {
    fetchDashboard();
    fetchTechSessions();
    fetchAddOnMetrics();
  }, [fetchDashboard, fetchTechSessions, fetchAddOnMetrics]);

  const visibility = data?.visibility ?? {};

  const statCards = [
    {
      key: "revenue",
      id: "stat-revenue",
      label: "Revenue",
      subtitle: "Today",
      value: data ? formatCurrency(data.todayRevenue) : "...",
      icon: DollarSign,
      color: "text-emerald-500",
      href: "/reports?tab=revenue",
    },
    {
      key: "carsInShop",
      id: "stat-cars-in-shop",
      label: "Cars In Shop",
      subtitle: `${data?.bayCapacity?.availableHours ?? 0}h available`,
      value: data?.carsInShop ?? 0,
      icon: Wrench,
      color: "text-blue-500",
      href: "/repair-orders",
    },
    {
      key: "aro",
      id: "stat-aro",
      label: "ARO",
      subtitle: "This month avg",
      value: data ? formatCurrency(data.aro) : "...",
      icon: TrendingUp,
      color: "text-purple-500",
      href: "/reports",
    },
    {
      key: "approvalRate",
      id: "stat-approval-rate",
      label: "Approval Rate",
      subtitle: "Items approved",
      value: data ? `${data.approvalRate}%` : "...",
      icon: CheckCircle,
      color: "text-green-500",
      href: "/reports",
    },
    {
      key: "feesSaved",
      id: "stat-fees-saved",
      label: "Fees Saved",
      subtitle: "Dual pricing earned",
      value: data ? formatCurrency(data.feesSaved) : "...",
      icon: ShieldCheck,
      color: "text-amber-500",
      href: "/reports?tab=revenue",
    },
  ];

  const visibleStatCards = statCards.filter((c) => visibility[c.key] !== false);

  const bayUtilization = data?.bayCapacity
    ? data.bayCapacity.totalSellableHours > 0
      ? Math.round((data.bayCapacity.bookedHours / data.bayCapacity.totalSellableHours) * 100)
      : 0
    : 0;

  if (loading && !data) {
    return (
      <AutoLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AutoLayout>
    );
  }

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
            <Link href="/repair-orders/new">
              <Button className="gap-2" data-testid="button-new-ro">
                <Plus className="h-4 w-4" />
                New Repair Order
              </Button>
            </Link>
            <Link href="/customers/new">
              <Button variant="outline" className="gap-2" data-testid="button-new-customer">
                <Users className="h-4 w-4" />
                New Customer
              </Button>
            </Link>
          </div>
        </div>

        {visibleStatCards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {visibleStatCards.map((stat) => (
              <Link key={stat.key} href={stat.href} className="min-w-0">
                <Card className="hover-elevate cursor-pointer" id={stat.id} data-testid={stat.id}>
                  <CardContent className="p-4 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <stat.icon className={`h-5 w-5 ${stat.color} shrink-0`} />
                    </div>
                    <p className="text-xl sm:text-2xl font-bold truncate">
                      {loading ? "..." : stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{stat.subtitle}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-4">
            {visibility.openRos !== false && (
              <Card data-testid="card-open-ros">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-base">Open Repair Orders</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-[140px]"
                      data-testid="input-start-date"
                    />
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-[140px]"
                      data-testid="input-end-date"
                    />
                    {(startDate || endDate) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStartDate("");
                          setEndDate("");
                        }}
                        data-testid="button-clear-dates"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : data?.openROs && data.openROs.length > 0 ? (
                    data.openROs.map((ro) => (
                      <Link key={ro.id} href={`/repair-orders/${ro.id}`}>
                        <div
                          className="flex items-center justify-between gap-2 rounded-md border p-3 hover-elevate cursor-pointer"
                          data-testid={`ro-row-${ro.id}`}
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium truncate">
                                RO #{ro.roNumber}
                              </p>
                              <Badge
                                className={`text-xs no-default-hover-elevate no-default-active-elevate ${getStatusColor(ro.status)}`}
                                variant="secondary"
                              >
                                {ro.status.replace(/_/g, " ")}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              {ro.customer && (
                                <span className="truncate">
                                  {ro.customer.firstName} {ro.customer.lastName}
                                </span>
                              )}
                              {ro.vehicle && (ro.vehicle.year || ro.vehicle.make || ro.vehicle.model) && (
                                <span className="truncate">
                                  {[ro.vehicle.year, ro.vehicle.make, ro.vehicle.model].filter(Boolean).join(" ")}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold">
                              {formatCurrency(parseFloat(ro.totalCash) || 0)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mb-2" />
                      <p className="text-sm">No open repair orders</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {visibility.quickActions !== false && (
              <Card data-testid="card-quick-actions">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href="/repair-orders/new">
                    <Button variant="outline" className="w-full justify-start gap-3" data-testid="quick-new-ro">
                      <FileText className="h-4 w-4" />
                      Create New Estimate
                    </Button>
                  </Link>
                  <Link href="/customers/new">
                    <Button variant="outline" className="w-full justify-start gap-3" data-testid="quick-new-customer">
                      <Users className="h-4 w-4" />
                      Add New Customer
                    </Button>
                  </Link>
                  <Link href="/customers">
                    <Button variant="outline" className="w-full justify-start gap-3" data-testid="quick-edit-customer">
                      <UserCheck className="h-4 w-4" />
                      Edit Customer
                    </Button>
                  </Link>
                  <Link href="/schedule">
                    <Button variant="outline" className="w-full justify-start gap-3" data-testid="quick-schedule">
                      <Calendar className="h-4 w-4" />
                      View Schedule
                    </Button>
                  </Link>
                  <Link href="/inspections">
                    <Button variant="outline" className="w-full justify-start gap-3" data-testid="quick-dvi">
                      <ClipboardCheck className="h-4 w-4" />
                      Start Inspection
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            {visibility.appointmentsAvailability !== false && (
              <Card data-testid="card-appointments-availability">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-base">Today's Schedule</CardTitle>
                  <Link href="/schedule">
                    <Button variant="ghost" size="sm" data-testid="button-view-all-schedule">
                      View All
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data?.bayCapacity && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">Bay Capacity</span>
                        <span className="font-medium">
                          {data.bayCapacity.availableHours}h of {data.bayCapacity.totalSellableHours}h available
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-md h-2.5 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-md transition-all"
                          style={{
                            width: `${data.bayCapacity.totalSellableHours > 0
                              ? Math.min((data.bayCapacity.bookedHours / data.bayCapacity.totalSellableHours) * 100, 100)
                              : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {data?.staffOnDuty && data.staffOnDuty.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Staff On Duty</p>
                      <div className="flex flex-wrap gap-2">
                        {data.staffOnDuty.map((staff) => (
                          <div
                            key={staff.id}
                            className="flex items-center gap-1.5 text-sm"
                            data-testid={`staff-${staff.id}`}
                          >
                            <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate">{staff.firstName} {staff.lastName}</span>
                            <Badge variant="secondary" className="text-xs">
                              {staff.role}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {data?.appointments && data.appointments.length > 0 ? (
                      data.appointments.map((apt) => (
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
                                <span className="truncate">
                                  {apt.customer.firstName} {apt.customer.lastName}
                                </span>
                              )}
                              {apt.vehicle && (apt.vehicle.year || apt.vehicle.make || apt.vehicle.model) && (
                                <span className="truncate">
                                  {[apt.vehicle.year, apt.vehicle.make, apt.vehicle.model].filter(Boolean).join(" ")}
                                </span>
                              )}
                            </div>
                          </div>
                          {apt.customer?.phone && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="sm:invisible sm:group-hover:visible"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const token = localStorage.getItem("pcb_auto_token") || "";
                                  handleCall(apt.customer!.phone!, apt.customer!.id || 0, token);
                                }}
                                data-testid={`button-call-apt-${apt.id}`}
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="sm:invisible sm:group-hover:visible"
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
                                data-testid={`button-text-apt-${apt.id}`}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <Calendar className="h-8 w-8 mb-2" />
                        <p className="text-sm">No appointments today</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {visibility.shopStats !== false && (
              <Card data-testid="card-shop-stats">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-base">Shop Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Customers</span>
                    <span className="font-medium" data-testid="text-total-customers">
                      {data?.totalCustomers ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Monthly Revenue</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400" data-testid="text-monthly-revenue">
                      {data ? formatCurrency(data.monthRevenue) : "..."}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">ARO</span>
                    <span className="font-medium" data-testid="text-aro">
                      {data ? formatCurrency(data.aro) : "..."}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Bay Utilization</span>
                    <span className="font-medium" data-testid="text-bay-utilization">
                      {bayUtilization}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card data-testid="card-todays-addons">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Today's Add-Ons
                </CardTitle>
                {addOnMetrics && addOnMetrics.presented > 0 && (
                  <Badge variant="secondary" data-testid="badge-addon-rate">
                    {addOnMetrics.approvalRate}%
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {addOnLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : addOnMetrics && addOnMetrics.presented > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Presented</span>
                      <span className="font-medium" data-testid="text-addon-presented">
                        {addOnMetrics.presented}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Approved</span>
                      <span className="font-medium text-green-600 dark:text-green-400" data-testid="text-addon-approved">
                        {addOnMetrics.approved} ({addOnMetrics.approvalRate}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Declined</span>
                      <span className="font-medium text-destructive" data-testid="text-addon-declined">
                        {addOnMetrics.declined}
                      </span>
                    </div>
                    {addOnMetrics.pending > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Pending</span>
                        <span className="font-medium text-yellow-600 dark:text-yellow-400" data-testid="text-addon-pending">
                          {addOnMetrics.pending}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                    <ClipboardCheck className="h-8 w-8 mb-2" />
                    <p className="text-sm" data-testid="text-no-addons">No add-ons presented today</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card data-testid="card-active-tech-sessions">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Active Tech Sessions
            </CardTitle>
            <Badge variant="secondary" data-testid="badge-active-sessions-count">
              {techSessions.length}
            </Badge>
          </CardHeader>
          <CardContent>
            {techSessionsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : techSessions.length > 0 ? (
              <div className="space-y-2">
                {techSessions.map((ts) => (
                  <div
                    key={ts.session.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-3"
                    data-testid={`tech-session-${ts.session.id}`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-medium truncate" data-testid={`text-tech-name-${ts.session.id}`}>
                        {ts.techFirstName} {ts.techLastName}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span data-testid={`text-tech-ro-${ts.session.id}`}>RO #{ts.roNumber}</span>
                        <span className="truncate" data-testid={`text-tech-service-${ts.session.id}`}>{ts.serviceDescription}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs" data-testid={`badge-elapsed-${ts.session.id}`}>
                      <Clock className="h-3 w-3 mr-1" />
                      {formatElapsedTime(ts.session.clockIn)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <Wrench className="h-8 w-8 mb-2" />
                <p className="text-sm" data-testid="text-no-active-sessions">No active sessions</p>
              </div>
            )}
          </CardContent>
        </Card>
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
