import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Package,
  PackageCheck,
  AlertTriangle,
  ArrowLeft,
  Plus,
  History,
  Users,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import type { AgentInventory, InventoryLog } from "@shared/schema";

interface UserRole {
  role: string;
  memberId: number;
  organization: {
    id: number;
    name: string;
  };
  managerId: number | null;
}

function InventorySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-12 w-full" />
      </Card>
      <Card className="p-4">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function InventoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [restockQuantity, setRestockQuantity] = useState("");
  const [restockNotes, setRestockNotes] = useState("");

  const { data: userRole } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery<AgentInventory>({
    queryKey: ["/api/inventory"],
  });

  const { data: logs, isLoading: logsLoading } = useQuery<InventoryLog[]>({
    queryKey: ["/api/inventory/logs"],
  });

  const { data: allInventory, isLoading: allInventoryLoading } = useQuery<AgentInventory[]>({
    queryKey: ["/api/inventory/all"],
    enabled: userRole?.role === "master_admin",
  });

  const restockMutation = useMutation({
    mutationFn: async (data: { quantity: number; notes?: string }) => {
      const res = await apiRequest("POST", "/api/inventory/restock", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/all"] });
      setRestockQuantity("");
      setRestockNotes("");
      toast({
        title: "Inventory updated",
        description: "Brochures have been added to your inventory.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update inventory. Please try again.",
        variant: "destructive",
      });
    },
  });

  const thresholdMutation = useMutation({
    mutationFn: async (threshold: number) => {
      const res = await apiRequest("PATCH", "/api/inventory/threshold", { threshold });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Threshold updated",
        description: "Low stock warning threshold has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update threshold. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRestock = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(restockQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a positive number.",
        variant: "destructive",
      });
      return;
    }
    restockMutation.mutate({ quantity: qty, notes: restockNotes || undefined });
  };

  const handleThresholdChange = (value: number[]) => {
    thresholdMutation.mutate(value[0]);
  };

  const isAdmin = userRole?.role === "master_admin";
  const brochuresOnHand = inventory?.brochuresOnHand ?? 0;
  const brochuresDeployed = inventory?.brochuresDeployed ?? 0;
  const lowStockThreshold = inventory?.lowStockThreshold ?? 10;
  const isLowStock = brochuresOnHand < lowStockThreshold;

  const getChangeTypeLabel = (changeType: string) => {
    switch (changeType) {
      case "restock":
        return "Restocked";
      case "deploy":
        return "Deployed";
      case "return":
        return "Returned";
      case "adjustment":
        return "Adjusted";
      default:
        return changeType;
    }
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case "restock":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "deploy":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "return":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const isLoading = inventoryLoading || logsLoading;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <span className="font-semibold">Inventory</span>
        </div>
      </header>

      <main className="container max-w-md mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <InventorySkeleton />
        ) : (
          <>
            <section className="grid grid-cols-2 gap-4">
              <Card className="p-4" data-testid="card-on-hand">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">On Hand</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold" data-testid="text-on-hand-count">
                    {brochuresOnHand}
                  </span>
                  {isLowStock && (
                    <Badge
                      variant="destructive"
                      className="text-xs"
                      data-testid="badge-low-stock"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Low
                    </Badge>
                  )}
                </div>
              </Card>

              <Card className="p-4" data-testid="card-deployed">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <PackageCheck className="h-4 w-4" />
                  <span className="text-sm">Deployed</span>
                </div>
                <span className="text-3xl font-bold" data-testid="text-deployed-count">
                  {brochuresDeployed}
                </span>
              </Card>
            </section>

            <Card className="p-4" data-testid="card-restock">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Restock Brochures
              </h3>
              <form onSubmit={handleRestock} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity to add</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    placeholder="Enter quantity"
                    value={restockQuantity}
                    onChange={(e) => setRestockQuantity(e.target.value)}
                    className="min-h-[48px]"
                    data-testid="input-restock-quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="e.g., Received from warehouse"
                    value={restockNotes}
                    onChange={(e) => setRestockNotes(e.target.value)}
                    className="resize-none"
                    rows={2}
                    data-testid="input-restock-notes"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full min-h-[48px]"
                  disabled={restockMutation.isPending || !restockQuantity}
                  data-testid="button-restock"
                >
                  {restockMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Inventory
                    </>
                  )}
                </Button>
              </form>
            </Card>

            <Card className="p-4" data-testid="card-threshold">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Low Stock Alert
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Warn when below
                  </span>
                  <span className="font-semibold" data-testid="text-threshold-value">
                    {lowStockThreshold} brochures
                  </span>
                </div>
                <Slider
                  value={[lowStockThreshold]}
                  onValueCommit={handleThresholdChange}
                  min={0}
                  max={50}
                  step={5}
                  disabled={thresholdMutation.isPending}
                  className="min-h-[48px]"
                  data-testid="slider-threshold"
                />
                <p className="text-xs text-muted-foreground">
                  You'll see a warning badge when your inventory drops below this threshold.
                </p>
              </div>
            </Card>

            <Card className="p-4" data-testid="card-history">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Activity
              </h3>
              {!logs || logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No inventory activity yet
                </p>
              ) : (
                <div className="space-y-3">
                  {logs.slice(0, 10).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between gap-3 pb-3 border-b border-border last:border-0 last:pb-0"
                      data-testid={`log-item-${log.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${getChangeTypeColor(log.changeType)}`}
                          >
                            {getChangeTypeLabel(log.changeType)}
                          </Badge>
                          <span className="font-medium">
                            {log.quantity > 0 ? "+" : ""}{log.quantity}
                          </span>
                        </div>
                        {log.notes && (
                          <p className="text-sm text-muted-foreground truncate">
                            {log.notes}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {isAdmin && (
              <Card className="p-4" data-testid="card-team-inventory">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Inventory
                </h3>
                {allInventoryLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !allInventory || allInventory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No team inventory data
                  </p>
                ) : (
                  <div className="space-y-3">
                    {allInventory.map((inv) => {
                      const memberLowStock = inv.brochuresOnHand < inv.lowStockThreshold;
                      return (
                        <div
                          key={inv.id}
                          className={`flex items-center justify-between gap-3 p-3 rounded-lg ${
                            memberLowStock
                              ? "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800"
                              : "bg-muted/50"
                          }`}
                          data-testid={`team-inventory-${inv.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              Agent: {inv.agentId.slice(0, 8)}...
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {inv.brochuresOnHand} on hand, {inv.brochuresDeployed} deployed
                            </p>
                          </div>
                          {memberLowStock && (
                            <Badge
                              variant="destructive"
                              className="text-xs shrink-0"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Low Stock
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
