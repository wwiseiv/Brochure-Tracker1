import { useState, useEffect, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Save, Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

interface Customer { id: number; firstName: string; lastName: string; }
interface Vehicle { id: number; year: number | null; make: string | null; model: string | null; vin: string | null; }
interface StaffMember { id: number; firstName: string; lastName: string; role: string; }
interface LineItem {
  id: number; type: string; description: string; partNumber: string | null;
  quantity: string; unitPriceCash: string; unitPriceCard: string;
  totalCash: string; totalCard: string; status: string;
}

const STATUS_LABELS: Record<string, string> = {
  estimate: "Estimate", approved: "Approved", in_progress: "In Progress",
  completed: "Completed", invoiced: "Invoiced", paid: "Paid", void: "Void",
};

export default function AutoRepairOrderForm() {
  const { autoFetch } = useAutoAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/auto/repair-orders/:id");
  const { toast } = useToast();
  const isNew = params?.id === "new";
  const roId = isNew ? null : params?.id;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [ro, setRo] = useState<any>(null);

  const [form, setForm] = useState({
    customerId: "", vehicleId: "", technicianId: "",
    customerConcern: "", internalNotes: "", promisedDate: "",
  });

  const [newItem, setNewItem] = useState({
    type: "labor", description: "", partNumber: "", quantity: "1",
    unitPriceCash: "", laborHours: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [custRes, staffRes] = await Promise.all([
        autoFetch("/api/auto/customers"),
        autoFetch("/api/auto/staff"),
      ]);
      const custData = await custRes.json();
      const staffData = await staffRes.json();
      setCustomers(custData.customers || []);
      setStaff(staffData.users || []);
    } catch (err) { console.error(err); }
  }, [autoFetch]);

  const fetchRO = useCallback(async () => {
    if (!roId) return;
    setLoading(true);
    try {
      const res = await autoFetch(`/api/auto/repair-orders/${roId}`);
      const data = await res.json();
      setRo(data.repairOrder);
      setLineItems(data.lineItems || []);
      setForm({
        customerId: data.repairOrder.customerId?.toString() || "",
        vehicleId: data.repairOrder.vehicleId?.toString() || "",
        technicianId: data.repairOrder.technicianId?.toString() || "",
        customerConcern: data.repairOrder.customerConcern || "",
        internalNotes: data.repairOrder.internalNotes || "",
        promisedDate: data.repairOrder.promisedDate ? new Date(data.repairOrder.promisedDate).toISOString().split("T")[0] : "",
      });
      if (data.repairOrder.customerId) {
        const vRes = await autoFetch(`/api/auto/vehicles?customerId=${data.repairOrder.customerId}`);
        setVehicles(await vRes.json());
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [roId, autoFetch]);

  useEffect(() => { fetchData(); fetchRO(); }, [fetchData, fetchRO]);

  const onCustomerChange = async (customerId: string) => {
    setForm({ ...form, customerId, vehicleId: "" });
    if (customerId) {
      try {
        const res = await autoFetch(`/api/auto/vehicles?customerId=${customerId}`);
        setVehicles(await res.json());
      } catch (err) { console.error(err); }
    } else {
      setVehicles([]);
    }
  };

  const handleCreateRO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.vehicleId) {
      toast({ title: "Error", description: "Customer and vehicle required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await autoFetch("/api/auto/repair-orders", {
        method: "POST",
        body: JSON.stringify({
          customerId: parseInt(form.customerId),
          vehicleId: parseInt(form.vehicleId),
          technicianId: form.technicianId ? parseInt(form.technicianId) : null,
          customerConcern: form.customerConcern,
          internalNotes: form.internalNotes,
          promisedDate: form.promisedDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Repair Order Created" });
      setLocation(`/auto/repair-orders/${data.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleUpdateRO = async (updates: Record<string, any>) => {
    if (!roId) return;
    try {
      const res = await autoFetch(`/api/auto/repair-orders/${roId}`, {
        method: "PATCH", body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRo(data);
      toast({ title: "Updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const addLineItem = async () => {
    if (!roId || !newItem.description || !newItem.unitPriceCash) return;
    try {
      const res = await autoFetch(`/api/auto/repair-orders/${roId}/line-items`, {
        method: "POST", body: JSON.stringify(newItem),
      });
      const item = await res.json();
      if (!res.ok) throw new Error(item.error);
      setLineItems([...lineItems, item]);
      setNewItem({ type: "labor", description: "", partNumber: "", quantity: "1", unitPriceCash: "", laborHours: "" });
      await autoFetch(`/api/auto/repair-orders/${roId}/recalculate`, { method: "POST" }).then(r => r.json()).then(setRo);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteLineItem = async (itemId: number) => {
    try {
      await autoFetch(`/api/auto/line-items/${itemId}`, { method: "DELETE" });
      setLineItems(lineItems.filter(i => i.id !== itemId));
      if (roId) await autoFetch(`/api/auto/repair-orders/${roId}/recalculate`, { method: "POST" }).then(r => r.json()).then(setRo);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <AutoLayout><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div></AutoLayout>;

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/auto/repair-orders">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-xl font-bold">
            {isNew ? "New Repair Order" : `${ro?.roNumber || ""}`}
          </h1>
          {ro && (
            <Badge variant="outline" className="ml-2">
              {STATUS_LABELS[ro.status] || ro.status}
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Customer & Vehicle</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={isNew ? handleCreateRO : (e) => e.preventDefault()} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select value={form.customerId} onValueChange={onCustomerChange} disabled={!isNew}>
                    <SelectTrigger data-testid="select-customer"><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.firstName} {c.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vehicle *</Label>
                  <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v })} disabled={!isNew || !form.customerId}>
                    <SelectTrigger data-testid="select-vehicle"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.map(v => (
                        <SelectItem key={v.id} value={v.id.toString()}>
                          {[v.year, v.make, v.model].filter(Boolean).join(" ") || `VIN: ${v.vin || "Unknown"}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Technician</Label>
                  <Select value={form.technicianId} onValueChange={(v) => {
                    setForm({ ...form, technicianId: v });
                    if (!isNew) handleUpdateRO({ technicianId: parseInt(v) });
                  }}>
                    <SelectTrigger data-testid="select-tech"><SelectValue placeholder="Assign tech" /></SelectTrigger>
                    <SelectContent>
                      {staff.filter(s => s.role === "technician" || s.role === "owner").map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.firstName} {s.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Promised Date</Label>
                  <Input
                    type="date"
                    value={form.promisedDate}
                    onChange={(e) => {
                      setForm({ ...form, promisedDate: e.target.value });
                      if (!isNew) handleUpdateRO({ promisedDate: e.target.value });
                    }}
                    data-testid="input-promised-date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Customer Concern</Label>
                <Textarea
                  value={form.customerConcern}
                  onChange={(e) => setForm({ ...form, customerConcern: e.target.value })}
                  onBlur={() => { if (!isNew) handleUpdateRO({ customerConcern: form.customerConcern }); }}
                  rows={2}
                  data-testid="input-concern"
                />
              </div>

              {isNew && (
                <Button type="submit" className="w-full gap-2" disabled={saving} data-testid="button-create-ro">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Create Repair Order
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {!isNew && ro && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={ro.status} onValueChange={(v) => handleUpdateRO({ status: v })}>
                  <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">Line Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lineItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-md border" data-testid={`line-item-${item.id}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
                        <span className="text-sm font-medium truncate">{item.description}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Qty: {item.quantity} &middot; Cash: ${parseFloat(item.totalCash).toFixed(2)} &middot; Card: ${parseFloat(item.totalCard).toFixed(2)}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteLineItem(item.id)} data-testid={`button-delete-item-${item.id}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}

                <div className="border-t pt-3 space-y-3">
                  <p className="text-sm font-medium">Add Line Item</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Select value={newItem.type} onValueChange={(v) => setNewItem({ ...newItem, type: v })}>
                      <SelectTrigger data-testid="select-item-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="labor">Labor</SelectItem>
                        <SelectItem value="parts">Parts</SelectItem>
                        <SelectItem value="sublet">Sublet</SelectItem>
                        <SelectItem value="fee">Fee</SelectItem>
                        <SelectItem value="discount">Discount</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Description" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} data-testid="input-item-desc" />
                    <Input placeholder="Qty" type="number" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} data-testid="input-item-qty" />
                    <Input placeholder="Price (cash)" type="number" step="0.01" value={newItem.unitPriceCash} onChange={(e) => setNewItem({ ...newItem, unitPriceCash: e.target.value })} data-testid="input-item-price" />
                  </div>
                  {newItem.type === "parts" && (
                    <Input placeholder="Part Number" value={newItem.partNumber} onChange={(e) => setNewItem({ ...newItem, partNumber: e.target.value })} data-testid="input-part-number" />
                  )}
                  <Button variant="outline" className="gap-2" onClick={addLineItem} data-testid="button-add-item">
                    <Plus className="h-4 w-4" /> Add Item
                  </Button>
                </div>

                {ro && (
                  <div className="border-t pt-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal (Cash)</span><span>${parseFloat(ro.subtotalCash || "0").toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${parseFloat(ro.taxAmount || "0").toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-base"><span>Total (Cash)</span><span>${parseFloat(ro.totalCash || "0").toFixed(2)}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Total (Card)</span><span>${parseFloat(ro.totalCard || "0").toFixed(2)}</span></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AutoLayout>
  );
}
