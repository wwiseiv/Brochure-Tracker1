import { useEffect, useState, useCallback } from "react";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ClipboardCheck, Plus, Loader2, ChevronDown, ChevronUp, Camera, CheckCircle, AlertTriangle, XCircle, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DviTemplate {
  id: number;
  name: string;
  categories: any;
  isDefault: boolean;
}

interface Inspection {
  id: number;
  repairOrderId: number;
  status: string;
  overallCondition: string | null;
  technicianNotes: string | null;
  createdAt: string;
  repairOrder?: { roNumber: string } | null;
}

interface InspectionItem {
  id: number;
  inspectionId: number;
  category: string;
  itemName: string;
  condition: string;
  notes: string | null;
  photoUrls: string[];
  sortOrder: number;
}

const CONDITION_COLORS: Record<string, { label: string; icon: any; className: string }> = {
  good: { label: "Good", icon: CheckCircle, className: "text-green-600 dark:text-green-400" },
  fair: { label: "Fair", icon: AlertTriangle, className: "text-yellow-600 dark:text-yellow-400" },
  poor: { label: "Needs Attention", icon: XCircle, className: "text-red-600 dark:text-red-400" },
  not_inspected: { label: "Not Inspected", icon: Circle, className: "text-muted-foreground" },
};

const DEFAULT_CATEGORIES = {
  "Under Hood": [
    "Air Filter", "Battery", "Belts", "Coolant Level", "Coolant Hoses",
    "Power Steering Fluid", "Brake Fluid", "Transmission Fluid", "Engine Oil Level",
    "Wiper Fluid", "Wiper Blades"
  ],
  "Under Vehicle": [
    "CV Boots/Axles", "Exhaust System", "Fuel Lines", "Oil Leaks",
    "Suspension Components", "Shocks/Struts", "Steering Components",
    "Differential Fluid", "Transfer Case Fluid", "Frame/Underbody"
  ],
  "Brakes": [
    "Front Brake Pads", "Rear Brake Pads", "Front Rotors", "Rear Rotors",
    "Brake Lines", "Parking Brake", "Brake Calipers"
  ],
  "Tires & Wheels": [
    "LF Tire Tread", "RF Tire Tread", "LR Tire Tread", "RR Tire Tread",
    "Tire Pressure", "Wheel Condition", "Spare Tire", "Alignment"
  ],
  "Interior": [
    "Horn", "Interior Lights", "Dash Lights/Warning", "Seat Belts",
    "A/C System", "Heater", "Cabin Air Filter", "Power Windows",
    "Power Locks", "Mirrors"
  ],
  "Exterior": [
    "Headlights", "Tail Lights", "Turn Signals", "Brake Lights",
    "Windshield", "Body Condition", "Paint Condition", "Door Handles",
    "Weatherstripping", "Wipers"
  ],
  "Fluids & Filters": [
    "Engine Oil Condition", "Transmission Fluid Condition", "Coolant Condition",
    "Power Steering Fluid Condition", "Brake Fluid Condition", "Oil Filter",
    "Fuel Filter"
  ],
};

export default function AutoInspections() {
  const { autoFetch } = useAutoAuth();
  const { toast } = useToast();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeInspection, setActiveInspection] = useState<Inspection | null>(null);
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roNumber, setRoNumber] = useState("");

  const fetchInspections = useCallback(async () => {
    try {
      const res = await autoFetch("/api/auto/dvi/inspections");
      const data = await res.json();
      setInspections(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [autoFetch]);

  useEffect(() => { fetchInspections(); }, [fetchInspections]);

  const createInspection = async () => {
    if (!roNumber) return;
    try {
      const rosRes = await autoFetch(`/api/auto/repair-orders?status=all`);
      const rosData = await rosRes.json();
      const ro = (rosData.repairOrders || []).find((r: any) => r.roNumber === roNumber);
      if (!ro) { toast({ title: "Error", description: "RO not found", variant: "destructive" }); return; }

      const items: { category: string; itemName: string; sortOrder: number }[] = [];
      let sortOrder = 0;
      Object.entries(DEFAULT_CATEGORIES).forEach(([cat, catItems]) => {
        catItems.forEach((item) => {
          items.push({ category: cat, itemName: item, sortOrder: sortOrder++ });
        });
      });

      const res = await autoFetch("/api/auto/dvi/inspections", {
        method: "POST",
        body: JSON.stringify({ repairOrderId: ro.id, items }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const inspection = await res.json();
      setDialogOpen(false);
      setRoNumber("");
      toast({ title: "Inspection Created" });
      openInspection(inspection.id);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openInspection = async (id: number) => {
    try {
      const res = await autoFetch(`/api/auto/dvi/inspections/${id}`);
      const data = await res.json();
      setActiveInspection(data.inspection);
      setItems(data.items || []);
      const categories = new Set<string>();
      (data.items || []).forEach((item: InspectionItem) => categories.add(item.category));
      setExpandedCategories(categories);
    } catch (err) { console.error(err); }
  };

  const updateItemCondition = async (itemId: number, condition: string) => {
    try {
      const res = await autoFetch(`/api/auto/dvi/items/${itemId}`, {
        method: "PATCH", body: JSON.stringify({ condition }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setItems(items.map(i => i.id === itemId ? { ...i, condition } : i));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const updateItemNotes = async (itemId: number, notes: string) => {
    try {
      await autoFetch(`/api/auto/dvi/items/${itemId}`, {
        method: "PATCH", body: JSON.stringify({ notes }),
      });
      setItems(items.map(i => i.id === itemId ? { ...i, notes } : i));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const toggleCategory = (cat: string) => {
    const next = new Set(expandedCategories);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    setExpandedCategories(next);
  };

  const completeInspection = async () => {
    if (!activeInspection) return;
    try {
      await autoFetch(`/api/auto/dvi/inspections/${activeInspection.id}/complete`, {
        method: "POST",
      });
      toast({ title: "Inspection Completed" });
      setActiveInspection({ ...activeInspection, status: "completed" });
      fetchInspections();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const groupedItems = items.reduce<Record<string, InspectionItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const conditionStats = {
    good: items.filter(i => i.condition === "good").length,
    fair: items.filter(i => i.condition === "fair").length,
    poor: items.filter(i => i.condition === "poor").length,
    notInspected: items.filter(i => i.condition === "not_inspected").length,
  };

  if (activeInspection) {
    return (
      <AutoLayout>
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setActiveInspection(null)} data-testid="button-back-inspections">Back</Button>
              <h1 className="text-xl font-bold">Vehicle Inspection</h1>
              <Badge variant="outline" className="capitalize">{activeInspection.status}</Badge>
            </div>
            {activeInspection.status !== "completed" && (
              <Button onClick={completeInspection} data-testid="button-complete-inspection">Complete Inspection</Button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold text-green-600 dark:text-green-400">{conditionStats.good}</p><p className="text-[10px] text-muted-foreground">Good</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{conditionStats.fair}</p><p className="text-[10px] text-muted-foreground">Fair</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold text-red-600 dark:text-red-400">{conditionStats.poor}</p><p className="text-[10px] text-muted-foreground">Needs Work</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold text-muted-foreground">{conditionStats.notInspected}</p><p className="text-[10px] text-muted-foreground">Pending</p></CardContent></Card>
          </div>

          {Object.entries(groupedItems).map(([category, catItems]) => (
            <Card key={category}>
              <CardHeader
                className="cursor-pointer flex flex-row items-center justify-between gap-2 py-3"
                onClick={() => toggleCategory(category)}
              >
                <CardTitle className="text-sm">{category}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {catItems.filter(i => i.condition !== "not_inspected").length}/{catItems.length}
                  </span>
                  {expandedCategories.has(category) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
              {expandedCategories.has(category) && (
                <CardContent className="pt-0 space-y-3">
                  {catItems.sort((a, b) => a.sortOrder - b.sortOrder).map((item) => {
                    const cond = CONDITION_COLORS[item.condition] || CONDITION_COLORS.not_inspected;
                    const CondIcon = cond.icon;
                    return (
                      <div key={item.id} className="space-y-2 border-b last:border-b-0 pb-3 last:pb-0" data-testid={`dvi-item-${item.id}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CondIcon className={`h-4 w-4 ${cond.className}`} />
                            <span className="text-sm font-medium">{item.itemName}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(CONDITION_COLORS).map(([key, val]) => (
                            <Button
                              key={key}
                              variant={item.condition === key ? "default" : "outline"}
                              size="sm"
                              onClick={() => updateItemCondition(item.id, key)}
                              className="text-xs"
                              data-testid={`condition-${key}-${item.id}`}
                            >
                              {val.label}
                            </Button>
                          ))}
                        </div>
                        <Input
                          placeholder="Notes..."
                          defaultValue={item.notes || ""}
                          onBlur={(e) => updateItemNotes(item.id, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </AutoLayout>
    );
  }

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-inspections-title">
            <ClipboardCheck className="h-5 w-5" /> Digital Vehicle Inspections
          </h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-new-inspection">
                <Plus className="h-4 w-4" /> New Inspection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Start New Inspection</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>RO Number</Label>
                  <Input
                    value={roNumber}
                    onChange={(e) => setRoNumber(e.target.value)}
                    placeholder="e.g. RO-001"
                    data-testid="input-ro-number"
                  />
                </div>
                <Button className="w-full" onClick={createInspection} data-testid="button-start-inspection">Start Inspection</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : inspections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No inspections yet. Create one from a repair order.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {inspections.map((inspection) => (
              <Card
                key={inspection.id}
                className="hover-elevate cursor-pointer"
                onClick={() => openInspection(inspection.id)}
                data-testid={`card-inspection-${inspection.id}`}
              >
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-sm">{inspection.repairOrder?.roNumber || `Inspection #${inspection.id}`}</p>
                    <p className="text-xs text-muted-foreground">{new Date(inspection.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">{inspection.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AutoLayout>
  );
}
