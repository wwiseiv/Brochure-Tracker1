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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Save, Plus, Trash2, FileText, Download, DollarSign, CreditCard, Banknote, X, Phone, MessageSquare, Mail, Link2, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { handleCall, handleSms, handleEmail, SMS_TEMPLATES, EMAIL_TEMPLATES, logCommunication } from "@/lib/auto-communication";
import CopyMessageModal from "@/components/auto/CopyMessageModal";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { DesktopNudge } from "./DesktopNudge";

interface Customer { id: number; firstName: string; lastName: string; phone: string | null; email: string | null; }
interface Vehicle { id: number; year: number | null; make: string | null; model: string | null; vin: string | null; }
interface StaffMember { id: number; firstName: string; lastName: string; role: string; }
interface LineItem {
  id: number; type: string; description: string; partNumber: string | null;
  quantity: string; unitPriceCash: string; unitPriceCard: string;
  totalCash: string; totalCard: string; status: string;
  isAdjustable: boolean; isNtnf: boolean; costPrice: string | null; isTaxable: boolean;
}
interface Payment {
  id: number;
  amount: string;
  method: string;
  status: string;
  transactionId: string | null;
  notes: string | null;
  processedAt: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  estimate: "Estimate", approved: "Approved", in_progress: "In Progress",
  completed: "Completed", invoiced: "Invoiced", paid: "Paid", void: "Void",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", card: "Credit/Debit Card", check: "Check", financing: "Financing", other: "Other",
};

const METHOD_COLORS: Record<string, string> = {
  cash: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  card: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  check: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  financing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function AutoRepairOrderForm() {
  const { autoFetch, user } = useAutoAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/auto/repair-orders/:id");
  const { toast } = useToast();
  const isNew = params?.id === "new";
  const roId = isNew ? null : params?.id;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [ro, setRo] = useState<any>(null);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [balanceDue, setBalanceDue] = useState(0);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    method: "cash", amount: "", referenceNumber: "", notes: "",
  });

  const [smsModal, setSmsModal] = useState<{ phone: string; message: string } | null>(null);

  const [form, setForm] = useState({
    customerId: "", vehicleId: "", technicianId: "",
    customerConcern: "", internalNotes: "", promisedDate: "",
  });

  const [newItem, setNewItem] = useState({
    type: "labor", description: "", partNumber: "", quantity: "1",
    unitPriceCash: "", laborHours: "", isAdjustable: true, isNtnf: false,
    costPrice: "", isTaxable: true,
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

  const fetchPayments = useCallback(async () => {
    if (!roId) return;
    try {
      const res = await autoFetch(`/api/auto/repair-orders/${roId}/payments`);
      const data = await res.json();
      setPayments(data.payments || []);
      setTotalPaid(data.totalPaid || 0);
      setBalanceDue(data.balanceDue || 0);
    } catch (err) { console.error(err); }
  }, [roId, autoFetch]);

  useEffect(() => { fetchData(); fetchRO(); }, [fetchData, fetchRO]);
  useEffect(() => { fetchPayments(); }, [fetchPayments]);

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
      setNewItem({ type: "labor", description: "", partNumber: "", quantity: "1", unitPriceCash: "", laborHours: "", isAdjustable: true, isNtnf: false, costPrice: "", isTaxable: true });
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

  const handleRecordPayment = async () => {
    if (!roId || !paymentForm.amount || !paymentForm.method) return;
    setSubmittingPayment(true);
    try {
      const res = await autoFetch(`/api/auto/repair-orders/${roId}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: parseFloat(paymentForm.amount),
          method: paymentForm.method,
          referenceNumber: paymentForm.referenceNumber || undefined,
          notes: paymentForm.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Payment Recorded", description: `$${parseFloat(paymentForm.amount).toFixed(2)} via ${METHOD_LABELS[paymentForm.method]}` });
      setPaymentDialogOpen(false);
      setPaymentForm({ method: "cash", amount: "", referenceNumber: "", notes: "" });
      await Promise.all([fetchPayments(), fetchRO()]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSubmittingPayment(false); }
  };

  const handleVoidPayment = async (paymentId: number) => {
    try {
      const res = await autoFetch(`/api/auto/payments/${paymentId}/void`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Payment Voided" });
      await Promise.all([fetchPayments(), fetchRO()]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openPaymentDialog = () => {
    setPaymentForm({ method: "cash", amount: balanceDue > 0 ? balanceDue.toFixed(2) : "", referenceNumber: "", notes: "" });
    setPaymentDialogOpen(true);
  };

  const canVoidPayments = user?.role === "owner" || user?.role === "manager";

  const downloadPdf = async (type: string) => {
    if (!roId || downloadingPdf) return;
    setDownloadingPdf(type);
    try {
      const res = await autoFetch(`/api/auto/repair-orders/${roId}/pdf?type=${type}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${ro?.roNumber || "RO"}-${type}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to download PDF", variant: "destructive" });
    } finally {
      setDownloadingPdf(null);
    }
  };

  const canDownloadWorkOrder = ro && ["approved", "in_progress", "completed", "invoiced", "paid"].includes(ro.status);
  const canDownloadInvoice = ro && ["invoiced", "paid"].includes(ro.status);

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

        <DesktopNudge message="Building detailed estimates is easier on a tablet or desktop." dismissKey="ro-builder" />

        <div className="flex items-center gap-3">
          {ro && (
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => downloadPdf("estimate")} disabled={downloadingPdf !== null} data-testid="button-download-estimate-pdf">
                {downloadingPdf === "estimate" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
                Estimate PDF
              </Button>
              {canDownloadWorkOrder && (
                <Button variant="outline" size="sm" onClick={() => downloadPdf("work_order")} disabled={downloadingPdf !== null} data-testid="button-download-work-order-pdf">
                  {downloadingPdf === "work_order" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
                  Work Order PDF
                </Button>
              )}
              {canDownloadInvoice && (
                <Button variant="outline" size="sm" onClick={() => downloadPdf("invoice")} disabled={downloadingPdf !== null} data-testid="button-download-invoice-pdf">
                  {downloadingPdf === "invoice" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
                  Invoice PDF
                </Button>
              )}
              {ro && ["completed", "invoiced", "in_progress"].includes(ro.status) && (
                <Link href={`/auto/invoice/${ro.id}`}>
                  <Button size="sm" data-testid="button-take-payment">
                    <DollarSign className="h-4 w-4 mr-1" /> Invoice / Pay
                  </Button>
                </Link>
              )}
              {ro && form.customerId && (() => {
                const selectedCustomer = customers.find(c => c.id.toString() === form.customerId);
                const selectedVehicle = vehicles.find(v => v.id.toString() === form.vehicleId);
                const customerName = selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : "";
                const vehicleStr = selectedVehicle ? [selectedVehicle.year, selectedVehicle.make, selectedVehicle.model].filter(Boolean).join(" ") : "";
                const token = localStorage.getItem("pcb_auto_token") || "";
                const approvalUrl = `${window.location.origin}/auto/approve/${ro.approvalToken || ""}`;

                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-contact-customer">
                        <Phone className="h-4 w-4 mr-1" /> Contact
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {selectedCustomer?.phone && (
                        <DropdownMenuItem onClick={() => handleCall(selectedCustomer.phone!, parseInt(form.customerId), token, ro.id)} data-testid="menu-call-customer">
                          <Phone className="h-4 w-4 mr-2" /> Call {selectedCustomer.firstName}
                        </DropdownMenuItem>
                      )}
                      {selectedCustomer?.phone && (
                        <DropdownMenuItem onClick={() => {
                          const msg = SMS_TEMPLATES.general("Demo Auto Shop", customerName);
                          const result = handleSms(selectedCustomer.phone!, msg, parseInt(form.customerId), token, { repairOrderId: ro.id });
                          if (!result.isMobile) setSmsModal({ phone: result.phone, message: result.body });
                        }} data-testid="menu-text-customer">
                          <MessageSquare className="h-4 w-4 mr-2" /> Text {selectedCustomer.firstName}
                        </DropdownMenuItem>
                      )}
                      {selectedCustomer?.email && (
                        <DropdownMenuItem onClick={() => {
                          handleEmail(selectedCustomer.email!, `From Demo Auto Shop — RO #${ro.roNumber}`, `Hi ${selectedCustomer.firstName},\n\n`, parseInt(form.customerId), token, { repairOrderId: ro.id });
                        }} data-testid="menu-email-customer">
                          <Mail className="h-4 w-4 mr-2" /> Email {selectedCustomer.firstName}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {selectedCustomer?.phone && ro.approvalToken && (
                        <DropdownMenuItem onClick={() => {
                          const total = `$${parseFloat(ro.grandTotalCash || "0").toFixed(2)}`;
                          const msg = SMS_TEMPLATES.estimateApproval("Demo Auto Shop", customerName, ro.roNumber, total, approvalUrl);
                          const result = handleSms(selectedCustomer.phone!, msg, parseInt(form.customerId), token, { repairOrderId: ro.id, templateUsed: "estimate_approval", invoiceUrl: approvalUrl });
                          if (!result.isMobile) setSmsModal({ phone: result.phone, message: result.body });
                        }} data-testid="menu-text-estimate">
                          <MessageSquare className="h-4 w-4 mr-2" /> Text Estimate for Approval
                        </DropdownMenuItem>
                      )}
                      {selectedCustomer?.email && ro.approvalToken && (
                        <DropdownMenuItem onClick={() => {
                          const total = `$${parseFloat(ro.grandTotalCash || "0").toFixed(2)}`;
                          const tmpl = EMAIL_TEMPLATES.estimateApproval("Demo Auto Shop", customerName, vehicleStr, ro.roNumber, total, approvalUrl, "(888) 537-7332");
                          handleEmail(selectedCustomer.email!, tmpl.subject, tmpl.body, parseInt(form.customerId), token, { repairOrderId: ro.id, templateUsed: "estimate_approval", invoiceUrl: approvalUrl });
                        }} data-testid="menu-email-estimate">
                          <Mail className="h-4 w-4 mr-2" /> Email Estimate for Approval
                        </DropdownMenuItem>
                      )}
                      {ro.approvalToken && (
                        <DropdownMenuItem onClick={async () => {
                          await navigator.clipboard.writeText(approvalUrl);
                          logCommunication({ customerId: parseInt(form.customerId), repairOrderId: ro.id, channel: "link_copy", templateUsed: "approval_link", invoiceUrl: approvalUrl }, token);
                        }} data-testid="menu-copy-approval-link">
                          <Link2 className="h-4 w-4 mr-2" /> Copy Approval Link
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })()}
            </div>
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
                        <span className="text-sm font-medium truncate">{item.description}</span>
                        {item.isNtnf && <Badge variant="secondary" className="text-xs" data-testid={`badge-ntnf-${item.id}`}>NTNF</Badge>}
                        {item.isAdjustable === false && <Badge variant="secondary" className="text-xs" data-testid={`badge-fixed-${item.id}`}>Fixed</Badge>}
                        {item.isTaxable === false && <Badge variant="secondary" className="text-xs" data-testid={`badge-notax-${item.id}`}>No Tax</Badge>}
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
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Part Number" value={newItem.partNumber} onChange={(e) => setNewItem({ ...newItem, partNumber: e.target.value })} data-testid="input-part-number" />
                      <Input placeholder="Cost" type="number" step="0.01" value={newItem.costPrice} onChange={(e) => setNewItem({ ...newItem, costPrice: e.target.value })} data-testid="input-cost-price" />
                    </div>
                  )}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Checkbox id="chk-adjustable" checked={newItem.isAdjustable} onCheckedChange={(v) => setNewItem({ ...newItem, isAdjustable: v === true })} data-testid="checkbox-adjustable" />
                      <Label htmlFor="chk-adjustable" className="text-sm cursor-pointer">Adjustable</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="chk-ntnf" checked={newItem.isNtnf} onCheckedChange={(v) => setNewItem({ ...newItem, isNtnf: v === true })} data-testid="checkbox-ntnf" />
                      <Label htmlFor="chk-ntnf" className="text-sm cursor-pointer">NTNF</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="chk-taxable" checked={newItem.isTaxable} onCheckedChange={(v) => setNewItem({ ...newItem, isTaxable: v === true })} data-testid="checkbox-taxable" />
                      <Label htmlFor="chk-taxable" className="text-sm cursor-pointer">Taxable</Label>
                    </div>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={addLineItem} data-testid="button-add-item">
                    <Plus className="h-4 w-4" /> Add Item
                  </Button>
                </div>

                {ro && (
                  <div className="border-t pt-3 space-y-1 text-sm">
                    <div className="flex justify-between" data-testid="text-subtotal-cash"><span className="text-muted-foreground">Subtotal (Cash)</span><span>${parseFloat(ro.subtotalCash || "0").toFixed(2)}</span></div>
                    <div className="flex justify-between" data-testid="text-parts-tax"><span className="text-muted-foreground">Parts Tax</span><span>${parseFloat(ro.taxPartsAmount || "0").toFixed(2)}</span></div>
                    <div className="flex justify-between" data-testid="text-labor-tax"><span className="text-muted-foreground">Labor Tax</span><span>${parseFloat(ro.taxLaborAmount || "0").toFixed(2)}</span></div>
                    <div className="flex justify-between" data-testid="text-total-tax"><span className="text-muted-foreground">Total Tax</span><span>${parseFloat(ro.taxAmount || "0").toFixed(2)}</span></div>
                    <div className="flex justify-between" data-testid="text-fee-amount"><span className="text-muted-foreground">Fee Amount (card surcharge)</span><span>${parseFloat(ro.feeAmount || "0").toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-base" data-testid="text-total-cash"><span>Total (Cash)</span><span>${parseFloat(ro.totalCash || "0").toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-base" data-testid="text-total-card"><span>Total (Card)</span><span>${parseFloat(ro.totalCard || "0").toFixed(2)}</span></div>
                    <div className="flex justify-between text-muted-foreground" data-testid="text-adjustable"><span>Adjustable</span><span>${parseFloat(ro.totalAdjustable || "0").toFixed(2)}</span></div>
                    <div className="flex justify-between text-muted-foreground" data-testid="text-non-adjustable"><span>Non-Adjustable (NTNF)</span><span>${parseFloat(ro.totalNonAdjustable || "0").toFixed(2)}</span></div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Payments
                </CardTitle>
                <Button size="sm" onClick={openPaymentDialog} data-testid="button-record-payment">
                  <Plus className="h-4 w-4 mr-1" />
                  Record Payment
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {payments.length > 0 && (
                  <div className="space-y-2">
                    {payments.map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-md border ${p.status === "voided" ? "opacity-60" : ""}`}
                        data-testid={`payment-row-${p.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${METHOD_COLORS[p.method] || METHOD_COLORS.other}`}>
                              {METHOD_LABELS[p.method] || p.method}
                            </span>
                            <span className={`text-sm font-medium ${p.status === "voided" ? "line-through" : ""}`}>
                              ${parseFloat(p.amount).toFixed(2)}
                            </span>
                            {p.status === "voided" && (
                              <Badge variant="destructive" className="text-xs">Voided</Badge>
                            )}
                            {p.transactionId && (
                              <span className="text-xs text-muted-foreground">Ref: {p.transactionId}</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {p.processedAt ? new Date(p.processedAt).toLocaleString() : "N/A"}
                            {p.notes && ` \u2014 ${p.notes}`}
                          </div>
                        </div>
                        {canVoidPayments && p.status !== "voided" && (
                          <Button variant="ghost" size="icon" onClick={() => handleVoidPayment(p.id)} data-testid={`button-void-payment-${p.id}`}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {payments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No payments recorded yet</p>
                )}

                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between" data-testid="text-total-paid">
                    <span className="text-muted-foreground">Total Paid</span>
                    <span className="font-medium">${totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between" data-testid="text-balance-due">
                    <span className="text-muted-foreground">Balance Due</span>
                    <span className={`font-bold ${balanceDue > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                      ${balanceDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={paymentForm.method} onValueChange={(v) => setPaymentForm({ ...paymentForm, method: v })}>
                      <SelectTrigger data-testid="select-payment-method"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Credit/Debit Card</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="financing">Financing</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        data-testid="input-payment-amount"
                      />
                      {balanceDue > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPaymentForm({ ...paymentForm, amount: balanceDue.toFixed(2) })}
                        >
                          Pay Full Balance
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Reference # (optional)</Label>
                    <Input
                      placeholder="Check #, transaction ID, etc."
                      value={paymentForm.referenceNumber}
                      onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                      data-testid="input-payment-reference"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      placeholder="Payment notes..."
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleRecordPayment}
                    disabled={submittingPayment || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
                    data-testid="button-submit-payment"
                  >
                    {submittingPayment ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <DollarSign className="h-4 w-4 mr-1" />}
                    Record Payment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
      <CopyMessageModal
        open={smsModal !== null}
        onOpenChange={(open) => { if (!open) setSmsModal(null); }}
        phone={smsModal?.phone || ""}
        message={smsModal?.message || ""}
      />
    </AutoLayout>
  );
}
