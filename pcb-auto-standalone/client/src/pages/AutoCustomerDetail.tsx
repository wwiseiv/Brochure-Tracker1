import { useState, useEffect, useCallback } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Car, Phone, Mail, MapPin, Plus, FileText, Loader2, Save, Edit, MessageSquare, Link2 } from "lucide-react";
import { handleCall, handleSms, handleEmail, SMS_TEMPLATES, EMAIL_TEMPLATES } from "@/lib/auto-communication";
import CopyMessageModal from "@/components/auto/CopyMessageModal";

interface Customer {
  id: number; firstName: string; lastName: string;
  email: string | null; phone: string | null;
  address: string | null; city: string | null; state: string | null; zip: string | null;
  notes: string | null;
}

interface Vehicle {
  id: number; vin: string | null;
  year: number | null; make: string | null; model: string | null;
  trim: string | null; engine: string | null; color: string | null;
  mileage: number | null; licensePlate: string | null;
}

interface CommLog {
  id: number;
  channel: string;
  direction: string | null;
  templateUsed: string | null;
  recipientPhone: string | null;
  recipientEmail: string | null;
  subject: string | null;
  bodyPreview: string | null;
  createdAt: string;
  userName: string | null;
}

export default function AutoCustomerDetail() {
  const { autoFetch } = useAutoAuth();
  const [, params] = useRoute("/customers/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const customerId = params?.id;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    vin: "", year: "", make: "", model: "", trim: "",
    engine: "", color: "", mileage: "", licensePlate: "",
  });
  const [editForm, setEditForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    address: "", city: "", state: "", zip: "", notes: "",
  });
  const [decoding, setDecoding] = useState(false);
  const [smsModal, setSmsModal] = useState<{ phone: string; message: string } | null>(null);
  const [commHistory, setCommHistory] = useState<CommLog[]>([]);

  const fetchData = useCallback(async () => {
    if (!customerId || customerId === "new") return;
    try {
      const [custRes, vehRes, commRes] = await Promise.all([
        autoFetch(`/api/customers/${customerId}`),
        autoFetch(`/api/vehicles?customerId=${customerId}`),
        autoFetch(`/api/communication/customer/${customerId}`),
      ]);
      const custData = await custRes.json();
      const c = custData.customer;
      setCustomer(c);
      setEditForm({
        firstName: c.firstName || "", lastName: c.lastName || "",
        email: c.email || "", phone: c.phone || "",
        address: c.address || "", city: c.city || "",
        state: c.state || "", zip: c.zip || "", notes: c.notes || "",
      });
      setVehicles(await vehRes.json());
      try { setCommHistory(await commRes.json()); } catch { setCommHistory([]); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [customerId, autoFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveCustomer = async () => {
    setSaving(true);
    try {
      const res = await autoFetch(`/api/customers/${customerId}`, {
        method: "PATCH", body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setCustomer({ ...customer!, ...editForm });
      setEditMode(false);
      toast({ title: "Customer Updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const decodeVin = async () => {
    if (!vehicleForm.vin || vehicleForm.vin.length < 17) { toast({ title: "Error", description: "VIN must be 17 characters", variant: "destructive" }); return; }
    setDecoding(true);
    try {
      const res = await autoFetch(`/api/vehicles/vin-decode/${vehicleForm.vin}`);
      const data = await res.json();
      if (data.year) setVehicleForm({ ...vehicleForm, year: data.year.toString(), make: data.make || "", model: data.model || "", trim: data.trim || "", engine: data.engine || "" });
      toast({ title: "VIN Decoded" });
    } catch (err: any) {
      toast({ title: "VIN decode failed", description: err.message, variant: "destructive" });
    } finally { setDecoding(false); }
  };

  const addVehicle = async () => {
    if (!vehicleForm.make && !vehicleForm.vin) { toast({ title: "Error", description: "Provide at least VIN or Make/Model", variant: "destructive" }); return; }
    try {
      const res = await autoFetch("/api/vehicles", {
        method: "POST",
        body: JSON.stringify({
          customerId: parseInt(customerId!),
          vin: vehicleForm.vin || null,
          year: vehicleForm.year ? parseInt(vehicleForm.year) : null,
          make: vehicleForm.make || null, model: vehicleForm.model || null,
          trim: vehicleForm.trim || null, engine: vehicleForm.engine || null,
          color: vehicleForm.color || null,
          mileage: vehicleForm.mileage ? parseInt(vehicleForm.mileage) : null,
          licensePlate: vehicleForm.licensePlate || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add vehicle");
      const vehicle = await res.json();
      setVehicles([...vehicles, vehicle]);
      setVehicleDialogOpen(false);
      setVehicleForm({ vin: "", year: "", make: "", model: "", trim: "", engine: "", color: "", mileage: "", licensePlate: "" });
      toast({ title: "Vehicle Added" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <AutoLayout><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div></AutoLayout>;
  if (!customer) return <AutoLayout><div className="p-6 text-center"><p className="text-muted-foreground">Customer not found</p></div></AutoLayout>;

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/customers">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-xl font-bold" data-testid="text-customer-name">
            {customer.firstName} {customer.lastName}
          </h1>
          <Button variant="ghost" size="icon" onClick={() => setEditMode(!editMode)}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Customer Info</CardTitle></CardHeader>
          <CardContent>
            {editMode ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>First Name</Label><Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Last Name</Label><Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Email</Label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Address</Label><Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>City</Label><Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} /></div>
                  <div className="space-y-2"><Label>State</Label><Input maxLength={2} value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value.toUpperCase() })} /></div>
                  <div className="space-y-2"><Label>ZIP</Label><Input value={editForm.zip} onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })} /></div>
                </div>
                <div className="flex gap-2">
                  <Button className="gap-2" onClick={handleSaveCustomer} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {customer.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {customer.phone}</p>}
                {customer.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {customer.email}</p>}
                {customer.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {customer.address}, {customer.city} {customer.state} {customer.zip}</p>}
                <div className="flex items-center gap-2 pt-2">
                  {customer.phone && (
                    <Button variant="outline" size="sm" onClick={() => handleCall(customer.phone!, customer.id, localStorage.getItem("pcb_auto_token") || "")} data-testid="button-call-customer">
                      <Phone className="h-4 w-4 mr-1" /> Call
                    </Button>
                  )}
                  {customer.phone && (
                    <Button variant="outline" size="sm" onClick={() => {
                      const token = localStorage.getItem("pcb_auto_token") || "";
                      const msg = SMS_TEMPLATES.general("Demo Auto Shop", `${customer.firstName} ${customer.lastName}`);
                      const result = handleSms(customer.phone!, msg, customer.id, token);
                      if (!result.isMobile) {
                        setSmsModal({ phone: result.phone, message: result.body });
                      }
                    }} data-testid="button-text-customer">
                      <MessageSquare className="h-4 w-4 mr-1" /> Text
                    </Button>
                  )}
                  {customer.email && (
                    <Button variant="outline" size="sm" onClick={() => {
                      const token = localStorage.getItem("pcb_auto_token") || "";
                      handleEmail(
                        customer.email!,
                        `From Demo Auto Shop`,
                        `Hi ${customer.firstName},\n\n`,
                        customer.id,
                        token
                      );
                    }} data-testid="button-email-customer">
                      <Mail className="h-4 w-4 mr-1" /> Email
                    </Button>
                  )}
                </div>
                {customer.notes && <p className="text-muted-foreground mt-2">{customer.notes}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Vehicles ({vehicles.length})</CardTitle>
            <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2" data-testid="button-add-vehicle">
                  <Plus className="h-4 w-4" /> Add Vehicle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>VIN</Label>
                    <div className="flex gap-2">
                      <Input value={vehicleForm.vin} onChange={(e) => setVehicleForm({ ...vehicleForm, vin: e.target.value.toUpperCase() })} placeholder="17-digit VIN" maxLength={17} data-testid="input-vin" />
                      <Button variant="outline" onClick={decodeVin} disabled={decoding} data-testid="button-decode-vin">
                        {decoding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decode"}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2"><Label>Year</Label><Input value={vehicleForm.year} onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Make</Label><Input value={vehicleForm.make} onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Model</Label><Input value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2"><Label>Trim</Label><Input value={vehicleForm.trim} onChange={(e) => setVehicleForm({ ...vehicleForm, trim: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Engine</Label><Input value={vehicleForm.engine} onChange={(e) => setVehicleForm({ ...vehicleForm, engine: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2"><Label>Color</Label><Input value={vehicleForm.color} onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Mileage</Label><Input value={vehicleForm.mileage} onChange={(e) => setVehicleForm({ ...vehicleForm, mileage: e.target.value })} /></div>
                    <div className="space-y-2"><Label>License Plate</Label><Input value={vehicleForm.licensePlate} onChange={(e) => setVehicleForm({ ...vehicleForm, licensePlate: e.target.value })} /></div>
                  </div>
                  <Button className="w-full" onClick={addVehicle} data-testid="button-save-vehicle">Add Vehicle</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-2">
            {vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vehicles yet</p>
            ) : (
              vehicles.map(v => (
                <div key={v.id} className="flex items-center justify-between gap-3 p-3 rounded-md border" data-testid={`vehicle-${v.id}`}>
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{[v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") || "Unknown Vehicle"}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {v.vin && <span>VIN: {v.vin}</span>}
                        {v.mileage && <span>{v.mileage.toLocaleString()} mi</span>}
                        {v.color && <span>{v.color}</span>}
                        {v.licensePlate && <span>Plate: {v.licensePlate}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Communication History</CardTitle>
          </CardHeader>
          <CardContent>
            {commHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No communication history yet. Use the Call, Text, or Email buttons above to start.</p>
            ) : (
              <div className="space-y-2">
                {commHistory.slice(0, 10).map(log => {
                  const icon = log.channel === "call" ? Phone : log.channel === "sms" ? MessageSquare : log.channel === "email" ? Mail : Link2;
                  const Icon = icon;
                  const channelLabel = ({ call: "Called", sms: "Texted", email: "Emailed", link_copy: "Copied link" } as Record<string, string>)[log.channel] || log.channel;
                  const templateLabel = log.templateUsed ? ` — ${log.templateUsed.replace(/_/g, " ")}` : "";
                  const date = new Date(log.createdAt);
                  const timeStr = date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

                  return (
                    <div key={log.id} className="flex items-start gap-2 text-sm" data-testid={`comm-log-${log.id}`}>
                      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <span className="font-medium">{channelLabel}</span>
                        {templateLabel && <span className="text-muted-foreground">{templateLabel}</span>}
                        <span className="text-muted-foreground"> — {timeStr}</span>
                        {log.userName && <span className="text-muted-foreground"> (by {log.userName})</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Link href={`/repair-orders/new`}>
            <Button variant="outline" className="gap-2" data-testid="button-create-ro-from-customer">
              <FileText className="h-4 w-4" /> Create Repair Order
            </Button>
          </Link>
        </div>
      </div>
      <CopyMessageModal
        open={!!smsModal}
        onOpenChange={(o) => !o && setSmsModal(null)}
        phone={smsModal?.phone || ""}
        message={smsModal?.message || ""}
      />
    </AutoLayout>
  );
}
