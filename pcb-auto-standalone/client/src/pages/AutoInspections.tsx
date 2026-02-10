import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
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
import { ClipboardCheck, Plus, Loader2, ChevronDown, ChevronUp, Camera, CheckCircle, AlertTriangle, XCircle, Circle, Car, User, Wrench, Send, Calendar, FileText, Copy, ExternalLink, Link2, Zap, Search, ArrowLeft, ChevronRight, Phone } from "lucide-react";
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
  customerId?: number | null;
  vehicleId?: number | null;
  status: string;
  overallCondition: string | null;
  notes: string | null;
  vehicleMileage: number | null;
  technicianId: number | null;
  publicToken: string | null;
  sentToCustomerAt: string | null;
  createdAt: string;
  repairOrder?: { roNumber: string; status: string } | null;
  customer?: { id: number; firstName: string; lastName: string; phone: string } | null;
  vehicle?: { id: number; year: number; make: string; model: string; licensePlate: string } | null;
  technician?: { id: number; firstName: string; lastName: string } | null;
  conditionCounts?: { good: number; fair: number; poor: number; not_inspected: number; total: number } | null;
}

interface InspectionItem {
  id: number;
  inspectionId: number;
  categoryName: string;
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

function getStatusBadgeVariant(status: string, sentToCustomerAt: string | null): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  if (sentToCustomerAt) {
    return { label: "Sent", variant: "default" };
  }
  switch (status) {
    case "completed":
      return { label: "Completed", variant: "secondary" };
    case "in_progress":
      return { label: "In Progress", variant: "outline" };
    default:
      return { label: status, variant: "outline" };
  }
}

function getVehicleLabel(vehicle: Inspection["vehicle"]): string {
  if (!vehicle) return "";
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

function getCustomerName(customer: Inspection["customer"]): string {
  if (!customer) return "";
  return `${customer.firstName} ${customer.lastName}`;
}

export default function AutoInspections() {
  const { autoFetch } = useAutoAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeInspection, setActiveInspection] = useState<Inspection | null>(null);
  const [selectedListInspection, setSelectedListInspection] = useState<Inspection | null>(null);
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [modalStep, setModalStep] = useState<"choose" | "search-ro" | "search-customer" | "new-customer">("choose");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newYear, setNewYear] = useState("");
  const [newMake, setNewMake] = useState("");
  const [newModel, setNewModel] = useState("");

  const resetModal = useCallback(() => {
    setModalStep("choose");
    setSearchQuery("");
    setSearchResults([]);
    setCustomerResults([]);
    setSearchLoading(false);
    setCreating(false);
    setNewFirstName("");
    setNewLastName("");
    setNewPhone("");
    setNewYear("");
    setNewMake("");
    setNewModel("");
  }, []);

  useEffect(() => {
    if (!dialogOpen) resetModal();
  }, [dialogOpen, resetModal]);

  const buildDefaultItems = useCallback(() => {
    const items: { category: string; itemName: string; sortOrder: number }[] = [];
    let sortOrder = 0;
    Object.entries(DEFAULT_CATEGORIES).forEach(([cat, catItems]) => {
      catItems.forEach((item) => {
        items.push({ category: cat, itemName: item, sortOrder: sortOrder++ });
      });
    });
    return items;
  }, []);

  const fetchInspections = useCallback(async () => {
    try {
      const res = await autoFetch("/api/dvi/inspections");
      const data = await res.json();
      setInspections(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [autoFetch]);

  useEffect(() => { fetchInspections(); }, [fetchInspections]);

  const searchROs = useCallback(async (query: string) => {
    setSearchLoading(true);
    try {
      const url = query ? `/api/dvi/search?q=${encodeURIComponent(query)}` : `/api/dvi/search`;
      const res = await autoFetch(url);
      const data = await res.json();
      setSearchResults(data || []);
    } catch (err) { console.error(err); }
    finally { setSearchLoading(false); }
  }, [autoFetch]);

  const searchCustomers = useCallback(async (query: string) => {
    setSearchLoading(true);
    try {
      const url = query ? `/api/dvi/search-customers?q=${encodeURIComponent(query)}` : `/api/dvi/search-customers`;
      const res = await autoFetch(url);
      const data = await res.json();
      setCustomerResults(data || []);
    } catch (err) { console.error(err); }
    finally { setSearchLoading(false); }
  }, [autoFetch]);

  useEffect(() => {
    if (modalStep !== "search-ro") return;
    if (searchQuery.length === 0) { searchROs(""); return; }
    if (searchQuery.length < 2) return;
    const timer = setTimeout(() => searchROs(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, modalStep, searchROs]);

  useEffect(() => {
    if (modalStep !== "search-customer") return;
    if (searchQuery.length === 0) { searchCustomers(""); return; }
    if (searchQuery.length < 2) return;
    const timer = setTimeout(() => searchCustomers(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, modalStep, searchCustomers]);

  const createInspectionFromRO = async (roId: number) => {
    setCreating(true);
    try {
      const defaultItems = buildDefaultItems();
      const res = await autoFetch("/api/dvi/inspections", {
        method: "POST",
        body: JSON.stringify({ repairOrderId: roId, items: defaultItems }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed"); }
      const inspection = await res.json();
      setDialogOpen(false);
      resetModal();
      toast({ title: "Inspection Created" });
      openInspection(inspection.id);
      fetchInspections();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setCreating(false); }
  };

  const createStandaloneInspection = async (customerId: number, vehicleId: number) => {
    setCreating(true);
    try {
      const defaultItems = buildDefaultItems();
      const res = await autoFetch("/api/dvi/inspections", {
        method: "POST",
        body: JSON.stringify({ customerId, vehicleId, items: defaultItems }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed"); }
      const inspection = await res.json();
      setDialogOpen(false);
      resetModal();
      toast({ title: "Inspection Created" });
      openInspection(inspection.id);
      fetchInspections();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setCreating(false); }
  };

  const createNewCustomerAndInspection = async () => {
    if (!newFirstName || !newLastName || !newYear || !newMake || !newModel) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const custRes = await autoFetch("/api/customers", {
        method: "POST",
        body: JSON.stringify({ firstName: newFirstName, lastName: newLastName, phone: newPhone }),
      });
      if (!custRes.ok) throw new Error("Failed to create customer");
      const customer = await custRes.json();

      const vehRes = await autoFetch("/api/vehicles", {
        method: "POST",
        body: JSON.stringify({ customerId: customer.id, year: parseInt(newYear), make: newMake, model: newModel }),
      });
      if (!vehRes.ok) throw new Error("Failed to create vehicle");
      const vehicle = await vehRes.json();

      await createStandaloneInspection(customer.id, vehicle.id);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setCreating(false);
    }
  };

  const createROFromInspection = async () => {
    if (!activeInspection) return;
    setCreating(true);
    try {
      const res = await autoFetch(`/api/dvi/inspections/${activeInspection.id}/create-ro`, {
        method: "POST",
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed to create RO"); }
      const data = await res.json();
      toast({ title: "Repair Order Created", description: `RO ${data.roNumber || ""} created from inspection` });
      setLocation(`/repair-orders/${data.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setCreating(false); }
  };

  const openInspection = async (id: number) => {
    try {
      const listData = inspections.find(i => i.id === id) || null;
      setSelectedListInspection(listData);

      const res = await autoFetch(`/api/dvi/inspections/${id}`);
      const data = await res.json();
      setActiveInspection(data.inspection);
      setItems(data.items || []);
      const categories = new Set<string>();
      (data.items || []).forEach((item: InspectionItem) => categories.add(item.categoryName));
      setExpandedCategories(categories);
    } catch (err) { console.error(err); }
  };

  const updateItemCondition = async (itemId: number, condition: string) => {
    try {
      const res = await autoFetch(`/api/dvi/items/${itemId}`, {
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
      await autoFetch(`/api/dvi/items/${itemId}`, {
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
      await autoFetch(`/api/dvi/inspections/${activeInspection.id}/complete`, {
        method: "POST",
      });
      toast({ title: "Inspection Completed" });
      setActiveInspection({ ...activeInspection, status: "completed" });
      fetchInspections();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const sendToCustomer = async () => {
    if (!activeInspection) return;
    try {
      const res = await autoFetch(`/api/dvi/inspections/${activeInspection.id}/send`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to send");
      const updated = await res.json();
      setActiveInspection({ ...activeInspection, status: "sent", publicToken: updated.publicToken, sentToCustomerAt: new Date().toISOString() });
      const publicUrl = `${window.location.origin}/auto/inspect/${updated.publicToken}`;
      await navigator.clipboard.writeText(publicUrl);
      toast({ title: "Sent to Customer", description: "Public inspection link copied to clipboard" });
      fetchInspections();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const downloadPdf = () => {
    if (!activeInspection) return;
    const token = localStorage.getItem("pcb_auto_token");
    const url = `/api/dvi/inspections/${activeInspection.id}/pdf`;
    window.open(url + `?token=${encodeURIComponent(token || "")}`, "_blank");
  };

  const copyPublicLink = () => {
    if (!activeInspection?.publicToken) return;
    const publicUrl = `${window.location.origin}/auto/inspect/${activeInspection.publicToken}`;
    navigator.clipboard.writeText(publicUrl);
    toast({ title: "Link Copied", description: "Public inspection link copied to clipboard" });
  };

  const groupedItems = items.reduce<Record<string, InspectionItem[]>>((acc, item) => {
    if (!acc[item.categoryName]) acc[item.categoryName] = [];
    acc[item.categoryName].push(item);
    return acc;
  }, {});

  const conditionStats = {
    good: items.filter(i => i.condition === "good").length,
    fair: items.filter(i => i.condition === "fair").length,
    poor: items.filter(i => i.condition === "poor").length,
    notInspected: items.filter(i => i.condition === "not_inspected").length,
  };

  const vehicleLabel = selectedListInspection?.vehicle ? getVehicleLabel(selectedListInspection.vehicle) : null;
  const customerName = selectedListInspection?.customer ? getCustomerName(selectedListInspection.customer) : null;
  const technicianName = selectedListInspection?.technician
    ? `${selectedListInspection.technician.firstName} ${selectedListInspection.technician.lastName}`
    : null;

  if (activeInspection) {
    return (
      <AutoLayout>
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="ghost" size="sm" onClick={() => { setActiveInspection(null); setSelectedListInspection(null); }} data-testid="button-back-inspections">Back</Button>
              <h1 className="text-xl font-bold" data-testid="text-inspection-detail-title">
                {vehicleLabel || "Vehicle Inspection"}
              </h1>
              <Badge variant="outline" className="capitalize" data-testid="badge-inspection-status">{activeInspection.status}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeInspection.status === "in_progress" && (
                <Button onClick={completeInspection} data-testid="button-complete-inspection">Complete Inspection</Button>
              )}
              {(activeInspection.status === "completed" || activeInspection.status === "sent") && (
                <Button variant="outline" onClick={sendToCustomer} className="gap-1" data-testid="button-send-customer">
                  <Send className="h-4 w-4" /> {activeInspection.status === "sent" ? "Resend" : "Send to Customer"}
                </Button>
              )}
              {activeInspection.publicToken && activeInspection.status === "sent" && (
                <Button variant="ghost" size="icon" onClick={copyPublicLink} data-testid="button-copy-link">
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={downloadPdf} data-testid="button-download-pdf">
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!activeInspection.repairOrderId && (
            <Button
              onClick={createROFromInspection}
              disabled={creating}
              className="w-full gap-2"
              data-testid="button-create-ro-from-inspection"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
              Create RO from Inspection
            </Button>
          )}

          {(customerName || technicianName || activeInspection.vehicleMileage) && (
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {customerName && (
                <span className="flex items-center gap-1" data-testid="text-detail-customer">
                  <User className="h-3.5 w-3.5" /> {customerName}
                </span>
              )}
              {technicianName && (
                <span className="flex items-center gap-1" data-testid="text-detail-technician">
                  <Wrench className="h-3.5 w-3.5" /> {technicianName}
                </span>
              )}
              {activeInspection.vehicleMileage && (
                <span className="flex items-center gap-1" data-testid="text-detail-mileage">
                  <Car className="h-3.5 w-3.5" /> {activeInspection.vehicleMileage.toLocaleString()} mi
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold text-green-600 dark:text-green-400" data-testid="stat-good">{conditionStats.good}</p><p className="text-[10px] text-muted-foreground">Good</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold text-yellow-600 dark:text-yellow-400" data-testid="stat-fair">{conditionStats.fair}</p><p className="text-[10px] text-muted-foreground">Fair</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold text-red-600 dark:text-red-400" data-testid="stat-poor">{conditionStats.poor}</p><p className="text-[10px] text-muted-foreground">Needs Work</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold text-muted-foreground" data-testid="stat-pending">{conditionStats.notInspected}</p><p className="text-[10px] text-muted-foreground">Pending</p></CardContent></Card>
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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {modalStep === "choose" && "Start New Inspection"}
                  {modalStep === "search-ro" && "Link to Existing RO"}
                  {modalStep === "search-customer" && "Quick Inspection"}
                  {modalStep === "new-customer" && "New Customer & Vehicle"}
                </DialogTitle>
              </DialogHeader>

              {creating && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Creating inspection...</p>
                </div>
              )}

              {!creating && modalStep === "choose" && (
                <div className="space-y-3">
                  <Card
                    className="hover-elevate cursor-pointer"
                    onClick={() => { setModalStep("search-ro"); setSearchQuery(""); }}
                    data-testid="card-link-existing-ro"
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex items-center justify-center h-10 w-10 rounded-md bg-muted shrink-0">
                        <Link2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">Link to Existing RO</p>
                        <p className="text-xs text-muted-foreground">Search by customer name, vehicle, or RO number</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                  <Card
                    className="hover-elevate cursor-pointer"
                    onClick={() => { setModalStep("search-customer"); setSearchQuery(""); }}
                    data-testid="card-quick-inspection"
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex items-center justify-center h-10 w-10 rounded-md bg-muted shrink-0">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">Quick Inspection</p>
                        <p className="text-xs text-muted-foreground">Start without an RO — inspect now, create RO later</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </div>
              )}

              {!creating && modalStep === "search-ro" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { setModalStep("choose"); setSearchQuery(""); setSearchResults([]); }} data-testid="button-back-choose-ro">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search customer, vehicle, or RO number..."
                        className="pl-9"
                        autoFocus
                        data-testid="input-search-ro"
                      />
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {searchLoading && (
                      <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    )}
                    {!searchLoading && searchResults.length === 0 && (
                      <div className="text-center py-6 space-y-2">
                        <p className="text-sm text-muted-foreground">No matching ROs found</p>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => { setModalStep("search-customer"); setSearchQuery(""); }}
                          data-testid="link-quick-inspection-fallback"
                        >
                          Start a Quick Inspection instead
                        </Button>
                      </div>
                    )}
                    {!searchLoading && searchResults.map((ro: any) => {
                      const isClosed = ["completed", "invoiced", "void"].includes(ro.status);
                      return (
                        <Card
                          key={ro.id}
                          className={`${isClosed ? "opacity-50" : "hover-elevate cursor-pointer"}`}
                          onClick={() => { if (!isClosed) createInspectionFromRO(ro.id); }}
                          data-testid={`card-ro-result-${ro.id}`}
                        >
                          <CardContent className="p-3 space-y-1">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{ro.customerName || "Unknown Customer"}</p>
                                <p className="text-xs text-muted-foreground">{ro.roNumber}</p>
                              </div>
                              <Badge variant={isClosed ? "secondary" : "outline"} className="capitalize shrink-0" data-testid={`badge-ro-status-${ro.id}`}>
                                {isClosed ? "Closed" : ro.status}
                              </Badge>
                            </div>
                            {(ro.vehicleInfo || ro.year) && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Car className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  {ro.vehicleInfo || `${ro.year || ""} ${ro.make || ""} ${ro.model || ""}`.trim()}
                                  {ro.color ? ` · ${ro.color}` : ""}
                                  {ro.mileage ? ` · ${Number(ro.mileage).toLocaleString()} mi` : ""}
                                </span>
                              </p>
                            )}
                            {ro.hasDvi && (
                              <p className="text-xs flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                                <AlertTriangle className="h-3 w-3 shrink-0" /> Has existing inspection
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {!creating && modalStep === "search-customer" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { setModalStep("choose"); setSearchQuery(""); setCustomerResults([]); }} data-testid="button-back-choose-customer">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search customer or vehicle..."
                        className="pl-9"
                        autoFocus
                        data-testid="input-search-customer"
                      />
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {searchLoading && (
                      <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    )}
                    {!searchLoading && customerResults.length === 0 && (
                      <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground mb-2">No customers found</p>
                      </div>
                    )}
                    {!searchLoading && customerResults.map((cust: any) => (
                      <Card key={cust.id} data-testid={`card-customer-result-${cust.id}`}>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium">{cust.firstName} {cust.lastName}</span>
                            {cust.phone && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {cust.phone}
                              </span>
                            )}
                          </div>
                          {cust.vehicles && cust.vehicles.length > 0 && (
                            <div className="space-y-1 pl-6">
                              {cust.vehicles.map((v: any) => (
                                <div
                                  key={v.id}
                                  className="flex items-center justify-between gap-2 p-2 rounded-md hover-elevate cursor-pointer"
                                  onClick={() => createStandaloneInspection(cust.id, v.id)}
                                  data-testid={`vehicle-select-${v.id}`}
                                >
                                  <span className="text-sm flex items-center gap-1.5">
                                    <Car className="h-3.5 w-3.5 text-muted-foreground" />
                                    {v.year} {v.make} {v.model}
                                  </span>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              ))}
                            </div>
                          )}
                          {(!cust.vehicles || cust.vehicles.length === 0) && (
                            <p className="text-xs text-muted-foreground pl-6">No vehicles on file</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setModalStep("new-customer")}
                    data-testid="button-new-customer"
                  >
                    <Plus className="h-4 w-4" /> New Customer
                  </Button>
                </div>
              )}

              {!creating && modalStep === "new-customer" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setModalStep("search-customer")} data-testid="button-back-search-customer">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">Back to search</span>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Customer Info</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">First Name</Label>
                        <Input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} placeholder="First name" data-testid="input-new-first-name" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Last Name</Label>
                        <Input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} placeholder="Last name" data-testid="input-new-last-name" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone</Label>
                      <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="(555) 555-1234" data-testid="input-new-phone" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Vehicle Info</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Year</Label>
                        <Input value={newYear} onChange={(e) => setNewYear(e.target.value)} placeholder="2024" data-testid="input-new-year" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Make</Label>
                        <Input value={newMake} onChange={(e) => setNewMake(e.target.value)} placeholder="Toyota" data-testid="input-new-make" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Model</Label>
                        <Input value={newModel} onChange={(e) => setNewModel(e.target.value)} placeholder="Camry" data-testid="input-new-model" />
                      </div>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={createNewCustomerAndInspection}
                    disabled={!newFirstName || !newLastName || !newYear || !newMake || !newModel}
                    data-testid="button-create-customer-inspection"
                  >
                    Create & Start Inspection
                  </Button>
                </div>
              )}
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
            {inspections.map((inspection) => {
              const vLabel = getVehicleLabel(inspection.vehicle);
              const cName = getCustomerName(inspection.customer);
              const tName = inspection.technician
                ? `${inspection.technician.firstName} ${inspection.technician.lastName}`
                : null;
              const counts = inspection.conditionCounts;
              const statusInfo = getStatusBadgeVariant(inspection.status, inspection.sentToCustomerAt || null);

              return (
                <Card
                  key={inspection.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => openInspection(inspection.id)}
                  data-testid={`card-inspection-${inspection.id}`}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate" data-testid={`text-vehicle-${inspection.id}`}>
                          {vLabel || `Inspection #${inspection.id}`}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          {cName && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-customer-${inspection.id}`}>
                              <User className="h-3 w-3" /> {cName}
                            </span>
                          )}
                          {inspection.repairOrder?.roNumber && (
                            <span className="text-xs text-muted-foreground" data-testid={`text-ro-${inspection.id}`}>
                              {inspection.repairOrder.roNumber}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={statusInfo.variant} className="capitalize shrink-0" data-testid={`badge-status-${inspection.id}`}>
                        {statusInfo.label === "Sent" && <Send className="h-3 w-3 mr-1" />}
                        {statusInfo.label}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {tName && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-technician-${inspection.id}`}>
                            <Wrench className="h-3 w-3" /> {tName}
                          </span>
                        )}
                        {counts && (counts.good > 0 || counts.fair > 0 || counts.poor > 0) && (
                          <div className="flex items-center gap-1.5" data-testid={`condition-summary-${inspection.id}`}>
                            {counts.good > 0 && (
                              <span className="flex items-center gap-0.5 text-xs font-medium text-green-600 dark:text-green-400" data-testid={`count-good-${inspection.id}`}>
                                <span className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400 inline-block" />
                                {counts.good}
                              </span>
                            )}
                            {counts.fair > 0 && (
                              <span className="flex items-center gap-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400" data-testid={`count-fair-${inspection.id}`}>
                                <span className="h-2 w-2 rounded-full bg-yellow-600 dark:bg-yellow-400 inline-block" />
                                {counts.fair}
                              </span>
                            )}
                            {counts.poor > 0 && (
                              <span className="flex items-center gap-0.5 text-xs font-medium text-red-600 dark:text-red-400" data-testid={`count-poor-${inspection.id}`}>
                                <span className="h-2 w-2 rounded-full bg-red-600 dark:bg-red-400 inline-block" />
                                {counts.poor}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-date-${inspection.id}`}>
                        <Calendar className="h-3 w-3" />
                        {new Date(inspection.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AutoLayout>
  );
}
