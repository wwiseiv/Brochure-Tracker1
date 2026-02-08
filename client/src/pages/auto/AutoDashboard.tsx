import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Calendar, DollarSign, Plus, ClipboardCheck } from "lucide-react";
import { AutoLayout } from "./AutoLayout";

interface DashboardStats {
  totalRepairOrders: number;
  openRepairOrders: number;
  totalCustomers: number;
  todayAppointments: number;
  monthRevenue: number;
}

export default function AutoDashboard() {
  const { autoFetch, user } = useAutoAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    autoFetch("/api/auto/dashboard/stats")
      .then((res) => res.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
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
      </div>
    </AutoLayout>
  );
}
