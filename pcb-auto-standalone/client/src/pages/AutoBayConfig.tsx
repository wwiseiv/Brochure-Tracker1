import { useEffect, useState, useCallback } from "react";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Wrench, Save, Loader2, Clock } from "lucide-react";

interface BayConfig {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
  sellableHoursPerDay: string;
}

export default function AutoBayConfig() {
  const { autoFetch, user } = useAutoAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [bays, setBays] = useState<BayConfig[]>([]);
  const [editedHours, setEditedHours] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const canEdit = ["owner", "manager"].includes(user?.role || "");

  const fetchBays = useCallback(async () => {
    try {
      const res = await autoFetch("/api/bays/config");
      const data = await res.json();
      setBays(data);
      const hours: Record<number, string> = {};
      data.forEach((bay: BayConfig) => {
        hours[bay.id] = bay.sellableHoursPerDay || "8";
      });
      setEditedHours(hours);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [autoFetch]);

  useEffect(() => {
    fetchBays();
  }, [fetchBays]);

  const handleSave = async (bayId: number) => {
    setSavingId(bayId);
    try {
      const res = await autoFetch(`/api/bays/${bayId}/config`, {
        method: "PATCH",
        body: JSON.stringify({ sellableHoursPerDay: editedHours[bayId] }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setBays((prev) =>
        prev.map((b) =>
          b.id === bayId ? { ...b, sellableHoursPerDay: editedHours[bayId] } : b
        )
      );
      toast({ title: "Bay configuration saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const totalSellableHours = bays
    .filter((b) => b.isActive)
    .reduce((sum, b) => sum + parseFloat(editedHours[b.id] || b.sellableHoursPerDay || "0"), 0);

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
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        <h1
          className="text-xl font-bold flex items-center gap-2"
          data-testid="text-bay-config-title"
        >
          <Wrench className="h-5 w-5" /> Bay Configuration
        </h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sellable Hours per Bay</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure sellable hours for each bay to track shop capacity
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {bays.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No bays configured. Add bays in Shop Settings first.
              </p>
            )}
            {bays.map((bay) => (
              <div
                key={bay.id}
                className="flex items-center gap-3 border rounded-md p-3 flex-wrap"
                data-testid={`row-bay-${bay.id}`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                  <span className="font-medium text-sm">{bay.name}</span>
                  <Badge variant={bay.isActive ? "default" : "secondary"} className="text-xs">
                    {bay.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Hours/Day
                  </Label>
                  <Input
                    type="number"
                    step={0.5}
                    min={0}
                    max={24}
                    value={editedHours[bay.id] || ""}
                    onChange={(e) =>
                      setEditedHours((prev) => ({ ...prev, [bay.id]: e.target.value }))
                    }
                    disabled={!canEdit}
                    className="w-20"
                    data-testid={`input-bay-hours-${bay.id}`}
                  />
                  {canEdit && (
                    <Button
                      size="sm"
                      onClick={() => handleSave(bay.id)}
                      disabled={savingId === bay.id}
                      data-testid={`button-save-bay-${bay.id}`}
                    >
                      {savingId === bay.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {bays.length > 0 && (
              <div
                className="flex items-center justify-between pt-3 border-t"
                data-testid="text-total-sellable-hours"
              >
                <span className="text-sm font-medium">Total Sellable Hours/Day (Active Bays)</span>
                <span className="text-sm font-bold">{totalSellableHours.toFixed(1)} hours</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AutoLayout>
  );
}
