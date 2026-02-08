import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, ChevronRight, Loader2, Car, User } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  estimate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  invoiced: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  void: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

interface RepairOrder {
  id: number;
  roNumber: string;
  status: string;
  totalCash: string | null;
  totalCard: string | null;
  createdAt: string;
  promisedDate: string | null;
  customer?: { firstName: string; lastName: string } | null;
  vehicle?: { year: number | null; make: string | null; model: string | null } | null;
}

export default function AutoRepairOrders() {
  const { autoFetch } = useAutoAuth();
  const [ros, setRos] = useState<RepairOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchROs = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter === "all" ? "/api/auto/repair-orders" : `/api/auto/repair-orders?status=${statusFilter}`;
      const res = await autoFetch(url);
      const data = await res.json();
      setRos(data.repairOrders || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [autoFetch, statusFilter]);

  useEffect(() => { fetchROs(); }, [fetchROs]);

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-ros-title">
            <FileText className="h-5 w-5" /> Repair Orders
          </h1>
          <Link href="/auto/repair-orders/new">
            <Button className="gap-2" data-testid="button-new-ro">
              <Plus className="h-4 w-4" /> New RO
            </Button>
          </Link>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="estimate">Estimate</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="invoiced">Invoiced</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : ros.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No repair orders yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {ros.map((ro) => (
              <Link key={ro.id} href={`/auto/repair-orders/${ro.id}`}>
                <Card className="hover-elevate cursor-pointer" data-testid={`card-ro-${ro.id}`}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-medium text-sm">{ro.roNumber}</span>
                        <Badge variant="outline" className={STATUS_COLORS[ro.status] || ""}>
                          {ro.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {ro.customer && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {ro.customer.firstName} {ro.customer.lastName}
                          </span>
                        )}
                        {ro.vehicle && (
                          <span className="flex items-center gap-1">
                            <Car className="h-3 w-3" /> {[ro.vehicle.year, ro.vehicle.make, ro.vehicle.model].filter(Boolean).join(" ")}
                          </span>
                        )}
                      </div>
                      {(ro.totalCash && parseFloat(ro.totalCash) > 0) && (
                        <p className="text-sm font-medium">${parseFloat(ro.totalCash).toFixed(2)}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AutoLayout>
  );
}
