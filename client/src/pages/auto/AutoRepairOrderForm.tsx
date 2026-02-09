import { useState, useEffect, useCallback, useRef } from "react";
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
import { ArrowLeft, Loader2, Save, Plus, Trash2, FileText, Download, DollarSign, CreditCard, Banknote, X, Phone, MessageSquare, Mail, Link2, ChevronDown, ChevronUp, Search, Clock, Wrench, Send, Check, XCircle, AlertTriangle } from "lucide-react";
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
  partsPayType: string | null; laborPayType: string | null;
  warrantyVendor: string | null; warrantyClaimNumber: string | null;
  retailValueOverride: string | null;
  lineOrigin: string | null; approvalStatus: string | null;
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
  estimate: "Estimate", sent: "Sent", approved: "Approved",
  partially_approved: "Partially Approved", declined: "Declined",
  in_progress: "In Progress", completed: "Completed",
  invoiced: "Invoiced", paid: "Paid", void: "Void",
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
  const isEstimateMode = isNew && new URLSearchParams(window.location.search).get("type") === "estimate";
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
  const [totalCash, setTotalCash] = useState(0);
  const [totalCard, setTotalCard] = useState(0);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [showInternalSummary, setShowInternalSummary] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    method: "cash", amount: "", referenceNumber: "", notes: "",
  });

  const [smsModal, setSmsModal] = useState<{ phone: string; message: string } | null>(null);

  const [receiptPromptOpen, setReceiptPromptOpen] = useState(false);
  const [receiptPaymentInfo, setReceiptPaymentInfo] = useState<{ amount: string; method: string } | null>(null);
  const [sendingReceipt, setSendingReceipt] = useState(false);

  const [partsDialogOpen, setPartsDialogOpen] = useState(false);
  const [partsSearch, setPartsSearch] = useState("");
  const [partsResults, setPartsResults] = useState<any[]>([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [addingPartId, setAddingPartId] = useState<string | null>(null);

  const [laborDialogOpen, setLaborDialogOpen] = useState(false);
  const [laborSearch, setLaborSearch] = useState("");
  const [laborResults, setLaborResults] = useState<any[]>([]);
  const [laborLoading, setLaborLoading] = useState(false);
  const [laborRate, setLaborRate] = useState("120");
  const [addingLaborId, setAddingLaborId] = useState<string | null>(null);

  const [sendEstimateOpen, setSendEstimateOpen] = useState(false);
  const [sendMethod, setSendMethod] = useState<"sms" | "email" | "both">("both");
  const [sendingEstimate, setSendingEstimate] = useState(false);
  const [convertingToWO, setConvertingToWO] = useState(false);

  const [closeValidationOpen, setCloseValidationOpen] = useState(false);
  const [closeWarnings, setCloseWarnings] = useState<string[]>([]);
  const [validatingClose, setValidatingClose] = useState(false);
  const [closingRO, setClosingRO] = useState(false);

  const [form, setForm] = useState({
    customerId: "", vehicleId: "", technicianId: "",
    customerConcern: "", internalNotes: "", promisedDate: "",
  });

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  const filteredCustomers = customerSearch.trim()
    ? customers.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(customerSearch.toLowerCase())
        || (c.phone && c.phone.includes(customerSearch))
        || (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase())))
    : customers;

  const selectedCustomer = form.customerId ? customers.find(c => c.id.toString() === form.customerId) : null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [newItem, setNewItem] = useState({
    type: "labor", description: "", partNumber: "", quantity: "1",
    unitPriceCash: "", laborHours: "", isAdjustable: true, isNtnf: false,
    costPrice: "", isTaxable: true,
    partsPayType: "customer_pay", laborPayType: "customer_pay",
    warrantyVendor: "", warrantyClaimNumber: "", retailValueOverride: "",
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
      setTotalCash(data.totalCash ? parseFloat(data.totalCash) : 0);
      setTotalCard(data.totalCard ? parseFloat(data.totalCard) : 0);
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

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === "completed" && ro && ro.status !== "completed") {
      setValidatingClose(true);
      try {
        const res = await autoFetch(`/api/auto/repair-orders/${roId}/close/validate`, {
          method: "POST",
        });
        const data = await res.json();
        if (data.warnings && data.warnings.length > 0) {
          setCloseWarnings(data.warnings);
          setCloseValidationOpen(true);
          return;
        }
        await handleUpdateRO({ status: newStatus });
      } catch {
        await handleUpdateRO({ status: newStatus });
      } finally {
        setValidatingClose(false);
      }
    } else {
      await handleUpdateRO({ status: newStatus });
    }
  };

  const handleConfirmClose = async () => {
    setClosingRO(true);
    try {
      const res = await autoFetch(`/api/auto/repair-orders/${roId}/close`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRo(data.repairOrder || data);
      toast({ title: "Repair Order Closed" });
      fetchRO();
    } catch {
      await handleUpdateRO({ status: "completed" });
    } finally {
      setClosingRO(false);
      setCloseValidationOpen(false);
      setCloseWarnings([]);
    }
  };

  const handleSendEstimate = async () => {
    if (!roId || !ro) return;
    setSendingEstimate(true);
    try {
      const token = localStorage.getItem("pcb_auto_token") || "";
      const selectedCustomer = customers.find(c => c.id.toString() === form.customerId);
      const selectedVehicle = vehicles.find(v => v.id.toString() === form.vehicleId);
      const customerName = selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : "";
      const vehicleStr = selectedVehicle ? [selectedVehicle.year, selectedVehicle.make, selectedVehicle.model].filter(Boolean).join(" ") : "";
      const total = `$${parseFloat(ro.totalCash || "0").toFixed(2)}`;
      const approvalUrl = `${window.location.origin}/auto/a/${ro.approvalShortCode || ro.approvalToken || ""}`;

      if ((sendMethod === "sms" || sendMethod === "both") && selectedCustomer?.phone) {
        const msg = SMS_TEMPLATES.estimateApproval("Demo Auto Shop", customerName, ro.roNumber, total, approvalUrl);
        const result = handleSms(selectedCustomer.phone, msg, parseInt(form.customerId), token, { repairOrderId: ro.id, templateUsed: "estimate_approval", invoiceUrl: approvalUrl });
        if (!result.isMobile) setSmsModal({ phone: result.phone, message: result.body });
      }

      if ((sendMethod === "email" || sendMethod === "both") && selectedCustomer?.email) {
        const tmpl = EMAIL_TEMPLATES.estimateApproval("Demo Auto Shop", customerName, vehicleStr, ro.roNumber, total, approvalUrl, "(888) 537-7332");
        handleEmail(selectedCustomer.email, tmpl.subject, tmpl.body, parseInt(form.customerId), token, { repairOrderId: ro.id, templateUsed: "estimate_approval", invoiceUrl: approvalUrl });
      }

      const res = await autoFetch(`/api/auto/repair-orders/${roId}/send-estimate`, {
        method: "POST", body: JSON.stringify({ method: sendMethod }),
      });
      if (res.ok) {
        const data = await res.json();
        setRo(data);
        toast({ title: "Estimate Sent", description: `Sent via ${sendMethod === "both" ? "SMS & Email" : sendMethod.toUpperCase()}` });
      }

      setSendEstimateOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to send estimate", variant: "destructive" });
    } finally {
      setSendingEstimate(false);
    }
  };

  const handleConvertToWorkOrder = async () => {
    if (!roId) return;
    setConvertingToWO(true);
    try {
      await handleUpdateRO({ status: "in_progress" });
      toast({ title: "Converted", description: "Estimate converted to work order" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setConvertingToWO(false);
    }
  };

  const addLineItem = async () => {
    if (!roId) return;
    if (!newItem.description.trim()) {
      toast({ title: "Missing Description", description: "Please enter a description for the line item.", variant: "destructive" });
      return;
    }
    if (!newItem.unitPriceCash || parseFloat(newItem.unitPriceCash) <= 0) {
      toast({ title: "Missing Price", description: "Please enter a cash price for the line item.", variant: "destructive" });
      return;
    }
    try {
      const res = await autoFetch(`/api/auto/repair-orders/${roId}/line-items`, {
        method: "POST", body: JSON.stringify(newItem),
      });
      const item = await res.json();
      if (!res.ok) throw new Error(item.error);
      setLineItems([...lineItems, item]);
      setNewItem({ type: "labor", description: "", partNumber: "", quantity: "1", unitPriceCash: "", laborHours: "", isAdjustable: true, isNtnf: false, costPrice: "", isTaxable: true, partsPayType: "customer_pay", laborPayType: "customer_pay", warrantyVendor: "", warrantyClaimNumber: "", retailValueOverride: "" });
      await autoFetch(`/api/auto/repair-orders/${roId}/recalculate`, { method: "POST" }).then(r => r.json()).then(setRo);
      fetchPayments();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteLineItem = async (itemId: number) => {
    try {
      await autoFetch(`/api/auto/line-items/${itemId}`, { method: "DELETE" });
      setLineItems(lineItems.filter(i => i.id !== itemId));
      if (roId) {
        await autoFetch(`/api/auto/repair-orders/${roId}/recalculate`, { method: "POST" }).then(r => r.json()).then(setRo);
        fetchPayments();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleApprovalStatus = async (itemId: number, status: string) => {
    try {
      const res = await autoFetch(`/api/auto/line-items/${itemId}`, {
        method: "PATCH", body: JSON.stringify({ approvalStatus: status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLineItems(lineItems.map(i => i.id === itemId ? { ...i, approvalStatus: status } : i));
      toast({ title: status === "approved" ? "Line Approved" : "Line Declined" });
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
      setReceiptPaymentInfo({ amount: paymentForm.amount, method: paymentForm.method });
      setPaymentDialogOpen(false);
      setPaymentForm({ method: "cash", amount: "", referenceNumber: "", notes: "" });
      await Promise.all([fetchPayments(), fetchRO()]);
      setReceiptPromptOpen(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSubmittingPayment(false); }
  };

  const handleEmailReceipt = async () => {
    if (!roId) return;
    setSendingReceipt(true);
    try {
      const res = await autoFetch(`/api/auto/email/invoice`, {
        method: "POST",
        body: JSON.stringify({
          roId: parseInt(roId as string),
          type: "receipt",
          paymentMethod: receiptPaymentInfo?.method || "cash",
          paidAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Receipt Sent", description: "Receipt emailed to customer successfully." });
      setReceiptPromptOpen(false);
      setReceiptPaymentInfo(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSendingReceipt(false);
    }
  };

  const handleTextReceipt = () => {
    const selectedCustomer = customers.find(c => c.id.toString() === form.customerId);
    if (!selectedCustomer?.phone || !ro) return;
    const token = localStorage.getItem("pcb_auto_token") || "";
    const invoiceUrl = `${window.location.origin}/auto/invoice/${ro.id}`;
    const msg = `Hi ${selectedCustomer.firstName}, your receipt from Demo Auto Shop for RO #${ro.roNumber} ($${parseFloat(receiptPaymentInfo?.amount || "0").toFixed(2)}) is ready. View it here: ${invoiceUrl}`;
    const result = handleSms(selectedCustomer.phone, msg, parseInt(form.customerId), token, { repairOrderId: ro.id, templateUsed: "payment_receipt" });
    if (!result.isMobile) {
      setSmsModal({ phone: result.phone, message: result.body });
    }
    setReceiptPromptOpen(false);
    setReceiptPaymentInfo(null);
  };

  const handlePrintReceipt = () => {
    downloadPdf("invoice");
    setReceiptPromptOpen(false);
    setReceiptPaymentInfo(null);
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
    const cashBal = Math.max(0, totalCash - totalPaid);
    setPaymentForm({ method: "cash", amount: cashBal > 0 ? cashBal.toFixed(2) : "", referenceNumber: "", notes: "" });
    setPaymentDialogOpen(true);
  };

  const searchParts = async (query: string) => {
    setPartsLoading(true);
    try {
      const vehicle = vehicles.find(v => v.id.toString() === form.vehicleId);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (vehicle?.year) params.set("vehicleYear", vehicle.year.toString());
      if (vehicle?.make) params.set("vehicleMake", vehicle.make);
      if (vehicle?.model) params.set("vehicleModel", vehicle.model);
      const res = await autoFetch(`/api/auto/parts/search?${params.toString()}`);
      const data = await res.json();
      setPartsResults(data.parts || data.results || data || []);
    } catch (err) { console.error(err); }
    finally { setPartsLoading(false); }
  };

  const searchPartsDefault = () => searchParts("");

  const searchLabor = async (query: string) => {
    setLaborLoading(true);
    try {
      const vehicle = vehicles.find(v => v.id.toString() === form.vehicleId);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (vehicle?.year) params.set("vehicleYear", vehicle.year.toString());
      if (vehicle?.make) params.set("vehicleMake", vehicle.make);
      if (vehicle?.model) params.set("vehicleModel", vehicle.model);
      const res = await autoFetch(`/api/auto/labor/search?${params.toString()}`);
      const data = await res.json();
      setLaborResults(data.operations || data.results || data || []);
    } catch (err) { console.error(err); }
    finally { setLaborLoading(false); }
  };

  const searchLaborDefault = () => searchLabor("");

  const addPartToRO = async (part: any) => {
    if (!roId) return;
    setAddingPartId(part.id || part.partNumber);
    try {
      const res = await autoFetch(`/api/auto/repair-orders/${roId}/line-items`, {
        method: "POST",
        body: JSON.stringify({
          type: "parts",
          description: part.description,
          partNumber: part.partNumber,
          quantity: "1",
          unitPriceCash: part.listPrice.toString(),
          costPrice: part.unitCost.toString(),
          isTaxable: true,
          isAdjustable: true,
        }),
      });
      const item = await res.json();
      if (!res.ok) throw new Error(item.error);
      setLineItems(prev => [...prev, item]);
      await autoFetch(`/api/auto/repair-orders/${roId}/recalculate`, { method: "POST" }).then(r => r.json()).then(setRo);
      fetchPayments();
      toast({ title: "Part added to RO" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setAddingPartId(null); }
  };

  const addLaborToRO = async (labor: any) => {
    if (!roId) return;
    setAddingLaborId(labor.id || labor.operationCode);
    try {
      const price = labor.laborHours * parseFloat(laborRate);
      const res = await autoFetch(`/api/auto/repair-orders/${roId}/line-items`, {
        method: "POST",
        body: JSON.stringify({
          type: "labor",
          description: labor.description,
          quantity: "1",
          unitPriceCash: price.toFixed(2),
          laborHours: labor.laborHours.toString(),
          isTaxable: true,
          isAdjustable: true,
        }),
      });
      const item = await res.json();
      if (!res.ok) throw new Error(item.error);
      setLineItems(prev => [...prev, item]);
      await autoFetch(`/api/auto/repair-orders/${roId}/recalculate`, { method: "POST" }).then(r => r.json()).then(setRo);
      fetchPayments();
      toast({ title: "Labor operation added to RO" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setAddingLaborId(null); }
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
            {isNew ? (isEstimateMode ? "New Estimate" : "New Repair Order") : `${ro?.roNumber || ""}`}
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
              {ro && (ro.status === "estimate" || ro.status === "sent") && lineItems.length > 0 && (
                <Button size="sm" onClick={() => setSendEstimateOpen(true)} data-testid="button-send-estimate"
                  className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Mail className="h-4 w-4 mr-1" /> Send Estimate
                </Button>
              )}
              {ro && (ro.status === "approved" || ro.status === "partially_approved") && (
                <Button size="sm" onClick={handleConvertToWorkOrder} disabled={convertingToWO} data-testid="button-convert-wo"
                  className="bg-green-600 hover:bg-green-700 text-white">
                  {convertingToWO ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wrench className="h-4 w-4 mr-1" />}
                  Start Work Order
                </Button>
              )}
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
                const approvalUrl = `${window.location.origin}/auto/a/${ro.approvalShortCode || ro.approvalToken || ""}`;

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
                          const total = `$${parseFloat(ro.totalCash || "0").toFixed(2)}`;
                          const msg = SMS_TEMPLATES.estimateApproval("Demo Auto Shop", customerName, ro.roNumber, total, approvalUrl);
                          const result = handleSms(selectedCustomer.phone!, msg, parseInt(form.customerId), token, { repairOrderId: ro.id, templateUsed: "estimate_approval", invoiceUrl: approvalUrl });
                          if (!result.isMobile) setSmsModal({ phone: result.phone, message: result.body });
                        }} data-testid="menu-text-estimate">
                          <MessageSquare className="h-4 w-4 mr-2" /> Text Estimate for Approval
                        </DropdownMenuItem>
                      )}
                      {selectedCustomer?.email && ro.approvalToken && (
                        <DropdownMenuItem onClick={() => {
                          const total = `$${parseFloat(ro.totalCash || "0").toFixed(2)}`;
                          const tmpl = EMAIL_TEMPLATES.estimateApproval("Demo Auto Shop", customerName, vehicleStr, ro.roNumber, total, approvalUrl, "(888) 537-7332");
                          handleEmail(selectedCustomer.email!, tmpl.subject, tmpl.body, parseInt(form.customerId), token, { repairOrderId: ro.id, templateUsed: "estimate_approval", invoiceUrl: approvalUrl });
                        }} data-testid="menu-email-estimate">
                          <Mail className="h-4 w-4 mr-2" /> Email Estimate for Approval
                        </DropdownMenuItem>
                      )}
                      {ro.approvalToken && (
                        <DropdownMenuItem onSelect={(e) => {
                          e.preventDefault();
                          const url = approvalUrl;
                          const copyToClipboard = async () => {
                            if (navigator.clipboard && window.isSecureContext) {
                              try {
                                await navigator.clipboard.writeText(url);
                                toast({ title: "Link Copied", description: "Approval link copied to clipboard" });
                                logCommunication({ customerId: parseInt(form.customerId), repairOrderId: ro.id, channel: "link_copy", templateUsed: "approval_link", invoiceUrl: url }, token);
                                return;
                              } catch {}
                            }
                            const ta = document.createElement("textarea");
                            ta.value = url;
                            ta.setAttribute("readonly", "");
                            ta.style.position = "fixed";
                            ta.style.left = "0";
                            ta.style.top = "0";
                            ta.style.width = "1px";
                            ta.style.height = "1px";
                            ta.style.padding = "0";
                            ta.style.border = "none";
                            ta.style.outline = "none";
                            ta.style.boxShadow = "none";
                            ta.style.background = "transparent";
                            ta.style.opacity = "0.01";
                            ta.style.fontSize = "16px";
                            document.body.appendChild(ta);
                            ta.focus();
                            ta.setSelectionRange(0, url.length);
                            try {
                              const ok = document.execCommand("copy");
                              if (ok) {
                                toast({ title: "Link Copied", description: "Approval link copied to clipboard" });
                                logCommunication({ customerId: parseInt(form.customerId), repairOrderId: ro.id, channel: "link_copy", templateUsed: "approval_link", invoiceUrl: url }, token);
                              } else {
                                toast({ title: "Copy Failed", description: url, variant: "destructive" });
                              }
                            } catch {
                              toast({ title: "Copy Failed", description: url, variant: "destructive" });
                            } finally {
                              document.body.removeChild(ta);
                            }
                          };
                          copyToClipboard();
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
                  {!isNew ? (
                    <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm" data-testid="text-selected-customer">
                      {selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : "No customer"}
                    </div>
                  ) : selectedCustomer ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center flex-1 h-9 px-3 rounded-md border bg-muted text-sm" data-testid="text-selected-customer">
                        {selectedCustomer.firstName} {selectedCustomer.lastName}
                        {selectedCustomer.phone && <span className="text-muted-foreground ml-2 text-xs">{selectedCustomer.phone}</span>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setForm({ ...form, customerId: "", vehicleId: "" });
                          setVehicles([]);
                          setCustomerSearch("");
                        }}
                        data-testid="button-clear-customer"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative" ref={customerSearchRef}>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="Search by name, phone, or email..."
                          value={customerSearch}
                          onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            setCustomerDropdownOpen(true);
                          }}
                          onFocus={() => setCustomerDropdownOpen(true)}
                          className="pl-8"
                          autoComplete="off"
                          role="combobox"
                          aria-expanded={customerDropdownOpen}
                          aria-haspopup="listbox"
                          data-testid="input-customer-search"
                        />
                      </div>
                      {customerDropdownOpen && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-auto rounded-md border bg-popover shadow-md" role="listbox">
                          {filteredCustomers.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No customers found</div>
                          ) : (
                            filteredCustomers.slice(0, 50).map(c => (
                              <button
                                key={c.id}
                                type="button"
                                role="option"
                                className="w-full text-left px-3 py-2 text-sm hover-elevate cursor-pointer flex items-center justify-between"
                                onClick={() => {
                                  onCustomerChange(c.id.toString());
                                  setCustomerSearch("");
                                  setCustomerDropdownOpen(false);
                                }}
                                data-testid={`option-customer-${c.id}`}
                              >
                                <span className="font-medium">{c.firstName} {c.lastName}</span>
                                {(c.phone || c.email) && (
                                  <span className="text-xs text-muted-foreground ml-2 truncate">
                                    {c.phone || c.email}
                                  </span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
                <Select value={ro.status} onValueChange={(v) => handleStatusChange(v)} disabled={validatingClose}>
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
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setPartsDialogOpen(true); if (!partsResults.length) { setPartsSearch(""); searchPartsDefault(); } }} data-testid="button-parts-lookup">
                    <Search className="h-4 w-4 mr-1" /> Parts
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setLaborDialogOpen(true); if (!laborResults.length) { setLaborSearch(""); searchLaborDefault(); } }} data-testid="button-labor-guide">
                    <Clock className="h-4 w-4 mr-1" /> Labor Guide
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {lineItems.map((item) => {
                  const hasInternal = item.partsPayType === "internal" || item.laborPayType === "internal";
                  const hasWarranty = item.partsPayType === "warranty" || item.laborPayType === "warranty";
                  const isNonCustomerPay = hasInternal || hasWarranty;
                  const payTypeBg = hasWarranty
                    ? "bg-blue-50 dark:bg-blue-950/30"
                    : hasInternal
                    ? "bg-yellow-50 dark:bg-yellow-950/30"
                    : "";
                  const showApproval = item.lineOrigin && item.lineOrigin !== "original";
                  return (
                    <div key={item.id} className={`flex items-start justify-between gap-3 p-3 rounded-md border ${payTypeBg}`} data-testid={`line-item-${item.id}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
                          {item.lineOrigin === "addon" && (
                            <Badge className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-origin-${item.id}`}>ADD-ON</Badge>
                          )}
                          {item.lineOrigin === "inspection" && (
                            <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-origin-${item.id}`}>DVI</Badge>
                          )}
                          <span className="text-sm font-medium truncate">{item.description}</span>
                          {item.isNtnf && <Badge variant="secondary" className="text-xs" data-testid={`badge-ntnf-${item.id}`}>NTNF</Badge>}
                          {item.isAdjustable === false && <Badge variant="secondary" className="text-xs" data-testid={`badge-fixed-${item.id}`}>Fixed</Badge>}
                          {item.isTaxable === false && <Badge variant="secondary" className="text-xs" data-testid={`badge-notax-${item.id}`}>No Tax</Badge>}
                          {hasInternal && <Badge className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-internal-${item.id}`}>Internal</Badge>}
                          {hasWarranty && <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-warranty-${item.id}`}>Warranty</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Qty: {item.quantity} &middot; Cash: ${parseFloat(item.totalCash).toFixed(2)} &middot; Card: ${parseFloat(item.totalCard).toFixed(2)}
                        </div>
                        {showApproval && (
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {item.approvalStatus === "pending" && <Badge className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-approval-${item.id}`}>Pending</Badge>}
                            {item.approvalStatus === "approved" && <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-approval-${item.id}`}>Approved</Badge>}
                            {item.approvalStatus === "declined" && <Badge variant="destructive" className="text-xs no-default-hover-elevate no-default-active-elevate" data-testid={`badge-approval-${item.id}`}>Declined</Badge>}
                            {item.lineOrigin === "addon" && item.approvalStatus !== "approved" && (
                              <Button variant="outline" size="sm" onClick={() => handleApprovalStatus(item.id, "approved")} data-testid={`button-approve-${item.id}`}>
                                <Check className="h-3 w-3 mr-1" /> Approve
                              </Button>
                            )}
                            {item.lineOrigin === "addon" && item.approvalStatus !== "declined" && (
                              <Button variant="outline" size="sm" onClick={() => handleApprovalStatus(item.id, "declined")} data-testid={`button-decline-${item.id}`}>
                                <XCircle className="h-3 w-3 mr-1" /> Decline
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteLineItem(item.id)} data-testid={`button-delete-item-${item.id}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}

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
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Parts Pay Type</Label>
                      <Select value={newItem.partsPayType} onValueChange={(v) => setNewItem({ ...newItem, partsPayType: v })}>
                        <SelectTrigger data-testid="select-parts-pay-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer_pay">Customer Pay</SelectItem>
                          <SelectItem value="internal">Internal</SelectItem>
                          <SelectItem value="warranty">Warranty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Labor Pay Type</Label>
                      <Select value={newItem.laborPayType} onValueChange={(v) => setNewItem({ ...newItem, laborPayType: v })}>
                        <SelectTrigger data-testid="select-labor-pay-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer_pay">Customer Pay</SelectItem>
                          <SelectItem value="internal">Internal</SelectItem>
                          <SelectItem value="warranty">Warranty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {(newItem.partsPayType !== "customer_pay" || newItem.laborPayType !== "customer_pay") && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Retail Value</Label>
                        <Input placeholder="Retail value" type="number" step="0.01" value={newItem.retailValueOverride} onChange={(e) => setNewItem({ ...newItem, retailValueOverride: e.target.value })} data-testid="input-retail-value" />
                      </div>
                      {(newItem.partsPayType === "warranty" || newItem.laborPayType === "warranty") && (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Warranty Vendor</Label>
                            <Input placeholder="Vendor name" value={newItem.warrantyVendor} onChange={(e) => setNewItem({ ...newItem, warrantyVendor: e.target.value })} data-testid="input-warranty-vendor" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Claim Number</Label>
                            <Input placeholder="Claim #" value={newItem.warrantyClaimNumber} onChange={(e) => setNewItem({ ...newItem, warrantyClaimNumber: e.target.value })} data-testid="input-claim-number" />
                          </div>
                        </>
                      )}
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
                    <div className="flex justify-between font-bold text-base" data-testid="text-total-cash"><span>Total (Cash)</span><span>${parseFloat(ro.totalCash || "0").toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-base" data-testid="text-total-card"><span>Total (Card)</span><span>${parseFloat(ro.totalCard || "0").toFixed(2)}</span></div>
                    <div className="flex justify-between text-muted-foreground" data-testid="text-adjustable"><span>Adjustable</span><span>${parseFloat(ro.totalAdjustable || "0").toFixed(2)}</span></div>
                    <div className="flex justify-between text-muted-foreground" data-testid="text-non-adjustable"><span>Non-Adjustable (NTNF)</span><span>${parseFloat(ro.totalNonAdjustable || "0").toFixed(2)}</span></div>
                    {(() => {
                      const nonCustomerLines = lineItems.filter(i => i.partsPayType !== "customer_pay" || i.laborPayType !== "customer_pay");
                      if (nonCustomerLines.length === 0) return null;
                      const internalWarrantyTotal = nonCustomerLines.reduce((sum, i) => sum + parseFloat(i.retailValueOverride || i.totalCash || "0"), 0);
                      return (
                        <div className="pt-2 mt-2 border-t border-dashed" data-testid="summary-internal-warranty">
                          <button
                            type="button"
                            className="flex items-center justify-between w-full text-sm text-muted-foreground"
                            onClick={() => setShowInternalSummary(!showInternalSummary)}
                            data-testid="button-toggle-internal-summary"
                          >
                            <span>Internal & Warranty Charges</span>
                            <span className="flex items-center gap-1">
                              ${internalWarrantyTotal.toFixed(2)}
                              {showInternalSummary ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </span>
                          </button>
                          {showInternalSummary && (
                            <div className="mt-1 space-y-1 pl-2 text-xs text-muted-foreground">
                              {nonCustomerLines.map(i => (
                                <div key={i.id} className="flex justify-between" data-testid={`summary-line-${i.id}`}>
                                  <span className="truncate mr-2">{i.description}</span>
                                  <span>${parseFloat(i.retailValueOverride || i.totalCash || "0").toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
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
                    <span className="text-muted-foreground">Balance Due (Cash)</span>
                    <span className={`font-bold ${(totalCash - totalPaid) > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                      ${Math.max(0, totalCash - totalPaid).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between" data-testid="text-balance-due-card">
                    <span className="text-muted-foreground">Balance Due (Card)</span>
                    <span className={`font-bold ${(totalCard - totalPaid) > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                      ${Math.max(0, totalCard - totalPaid).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Dialog open={partsDialogOpen} onOpenChange={setPartsDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader className="flex-shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <DialogTitle className="flex items-center gap-2">
                      Parts Lookup
                      <Badge variant="secondary" className="text-xs font-normal">Powered by PartsTech</Badge>
                    </DialogTitle>
                    <Button size="sm" variant="ghost" onClick={() => setPartsDialogOpen(false)} data-testid="button-close-parts-dialog" className="flex-shrink-0">
                      <X className="h-4 w-4" />
                      <span className="ml-1 sm:hidden">Close</span>
                    </Button>
                  </div>
                </DialogHeader>
                <div className="space-y-4 flex-shrink-0">
                  {(() => {
                    const vehicle = vehicles.find(v => v.id.toString() === form.vehicleId);
                    return vehicle ? (
                      <Badge variant="outline" data-testid="badge-parts-vehicle">
                        Vehicle: {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}
                      </Badge>
                    ) : null;
                  })()}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Search parts (e.g., brake pads, oil filter)..."
                      value={partsSearch}
                      onChange={(e) => setPartsSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") searchParts(partsSearch); }}
                      data-testid="input-parts-search"
                    />
                    <Button size="sm" onClick={() => searchParts(partsSearch)} disabled={partsLoading} data-testid="button-parts-search">
                      {partsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                  <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
                    {partsLoading && (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {!partsLoading && partsResults.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No results found. Try a different search term.</p>
                    )}
                    {!partsLoading && partsResults.map((part, idx) => (
                      <div key={part.id || part.partNumber || idx} className="p-3 rounded-md border space-y-2" data-testid={`parts-result-${idx}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {part.partNumber && <Badge variant="outline" className="text-xs">{part.partNumber}</Badge>}
                              {part.brand && <Badge variant="secondary" className="text-xs">{part.brand}</Badge>}
                              {part.category && <Badge variant="secondary" className="text-xs">{part.category}</Badge>}
                            </div>
                            <p className="text-sm font-medium">{part.description}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {part.unitCost != null && <span>Cost: ${parseFloat(part.unitCost).toFixed(2)}</span>}
                              {part.listPrice != null && <span className="font-medium text-foreground">List: ${parseFloat(part.listPrice).toFixed(2)}</span>}
                              {part.coreCharge > 0 && <span>Core: ${parseFloat(part.coreCharge).toFixed(2)}</span>}
                            </div>
                            {part.suppliers && part.suppliers.length > 0 && (
                              <div className="flex items-center gap-3 flex-wrap mt-1">
                                {part.suppliers.map((s: any, si: number) => (
                                  <div key={si} className="flex items-center gap-1 text-xs">
                                    <span className={`inline-block h-2 w-2 rounded-full ${s.inStock ? "bg-green-500" : "bg-red-500"}`} />
                                    <span>{s.name}</span>
                                    {s.quantity != null && <span className="text-muted-foreground">({s.quantity})</span>}
                                    {s.deliveryTime && <span className="text-muted-foreground">{s.deliveryTime}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addPartToRO(part)}
                            disabled={addingPartId === (part.id || part.partNumber)}
                            data-testid={`button-add-part-${idx}`}
                          >
                            {addingPartId === (part.id || part.partNumber) ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Plus className="h-4 w-4 mr-1" />
                            )}
                            Add to RO
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
              </DialogContent>
            </Dialog>

            <Dialog open={laborDialogOpen} onOpenChange={setLaborDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader className="flex-shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <DialogTitle className="flex items-center gap-2">
                      MOTOR Labor Guide
                      <Badge variant="secondary" className="text-xs font-normal">Standard Labor Times</Badge>
                    </DialogTitle>
                    <Button size="sm" variant="ghost" onClick={() => setLaborDialogOpen(false)} data-testid="button-close-labor-dialog" className="flex-shrink-0">
                      <X className="h-4 w-4" />
                      <span className="ml-1 sm:hidden">Close</span>
                    </Button>
                  </div>
                </DialogHeader>
                <div className="space-y-4 flex-shrink-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    {(() => {
                      const vehicle = vehicles.find(v => v.id.toString() === form.vehicleId);
                      return vehicle ? (
                        <Badge variant="outline" data-testid="badge-labor-vehicle">
                          Vehicle: {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}
                        </Badge>
                      ) : null;
                    })()}
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-muted-foreground">Shop Labor Rate: $</span>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        className="w-20"
                        value={laborRate}
                        onChange={(e) => setLaborRate(e.target.value)}
                        data-testid="input-labor-rate"
                      />
                      <span className="text-muted-foreground">/hr</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Search labor operations (e.g., brake job, timing belt)..."
                      value={laborSearch}
                      onChange={(e) => setLaborSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") searchLabor(laborSearch); }}
                      data-testid="input-labor-search"
                    />
                    <Button size="sm" onClick={() => searchLabor(laborSearch)} disabled={laborLoading} data-testid="button-labor-search">
                      {laborLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                  <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
                    {laborLoading && (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {!laborLoading && laborResults.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No results found. Try a different search term.</p>
                    )}
                    {!laborLoading && laborResults.map((labor, idx) => {
                      const difficultyColors: Record<string, string> = {
                        Easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                        Moderate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                        Advanced: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
                        Expert: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                      };
                      const estimatedPrice = (labor.laborHours * parseFloat(laborRate || "0")).toFixed(2);
                      return (
                        <div key={labor.id || labor.operationCode || idx} className="p-3 rounded-md border space-y-2" data-testid={`labor-result-${idx}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {labor.operationCode && <Badge variant="outline" className="text-xs">{labor.operationCode}</Badge>}
                                {labor.category && <Badge variant="secondary" className="text-xs">{labor.category}</Badge>}
                                {labor.difficulty && (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${difficultyColors[labor.difficulty] || difficultyColors.Moderate}`}>
                                    {labor.difficulty}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium">{labor.description}</p>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="font-semibold text-base">{labor.laborHours} hrs</span>
                                <span className="text-muted-foreground">Estimated: ${estimatedPrice}</span>
                              </div>
                              {labor.includes && labor.includes.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  <span className="font-medium">Includes:</span>{" "}
                                  {labor.includes.join(", ")}
                                </div>
                              )}
                              {labor.notes && (
                                <p className="text-xs text-muted-foreground italic">{labor.notes}</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addLaborToRO(labor)}
                              disabled={addingLaborId === (labor.id || labor.operationCode)}
                              data-testid={`button-add-labor-${idx}`}
                            >
                              {addingLaborId === (labor.id || labor.operationCode) ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Plus className="h-4 w-4 mr-1" />
                              )}
                              Add to RO
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
              </DialogContent>
            </Dialog>

            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={paymentForm.method} onValueChange={(v) => {
                      const isCard = v === "card";
                      const methodBalance = Math.max(0, (isCard ? totalCard : totalCash) - totalPaid);
                      setPaymentForm({ ...paymentForm, method: v, amount: methodBalance > 0 ? methodBalance.toFixed(2) : paymentForm.amount });
                    }}>
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
                      {(() => {
                        const isCard = paymentForm.method === "card";
                        const methodBalance = Math.max(0, (isCard ? totalCard : totalCash) - totalPaid);
                        return methodBalance > 0 ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPaymentForm({ ...paymentForm, amount: methodBalance.toFixed(2) })}
                          >
                            Pay Full Balance
                          </Button>
                        ) : null;
                      })()}
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
      <Dialog open={receiptPromptOpen} onOpenChange={(open) => { if (!open) { setReceiptPromptOpen(false); setReceiptPaymentInfo(null); } }}>
        <DialogContent className="max-w-sm" data-testid="dialog-receipt-prompt">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Send Receipt
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Payment of {receiptPaymentInfo ? `$${parseFloat(receiptPaymentInfo.amount).toFixed(2)}` : ""} recorded. How would you like to share the receipt?
          </p>
          <div className="flex flex-col gap-2 mt-2">
            {(() => {
              const selectedCustomer = customers.find(c => c.id.toString() === form.customerId);
              return (
                <>
                  {selectedCustomer?.email && (
                    <Button onClick={handleEmailReceipt} disabled={sendingReceipt} className="justify-start gap-2" data-testid="button-email-receipt">
                      {sendingReceipt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      Email Receipt to {selectedCustomer.firstName}
                    </Button>
                  )}
                  {selectedCustomer?.phone && (
                    <Button variant="outline" onClick={handleTextReceipt} className="justify-start gap-2" data-testid="button-text-receipt">
                      <MessageSquare className="h-4 w-4" />
                      Text Receipt Link to {selectedCustomer.firstName}
                    </Button>
                  )}
                  <Button variant="outline" onClick={handlePrintReceipt} className="justify-start gap-2" data-testid="button-print-receipt">
                    <Download className="h-4 w-4" />
                    Download / Print Receipt PDF
                  </Button>
                </>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setReceiptPromptOpen(false); setReceiptPaymentInfo(null); }} data-testid="button-skip-receipt">
              Skip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CopyMessageModal
        open={smsModal !== null}
        onOpenChange={(open) => { if (!open) setSmsModal(null); }}
        phone={smsModal?.phone || ""}
        message={smsModal?.message || ""}
      />
      <Dialog open={sendEstimateOpen} onOpenChange={setSendEstimateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Estimate for Approval</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Send {ro?.roNumber} to {selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : "the customer"} for review and approval.
            </div>
            <div className="space-y-2">
              <Label>Send via</Label>
              <div className="flex gap-2">
                <Button variant={sendMethod === "sms" ? "default" : "outline"} size="sm"
                  onClick={() => setSendMethod("sms")} disabled={!selectedCustomer?.phone}
                  data-testid="button-send-sms">
                  <MessageSquare className="h-4 w-4 mr-1" /> SMS
                </Button>
                <Button variant={sendMethod === "email" ? "default" : "outline"} size="sm"
                  onClick={() => setSendMethod("email")} disabled={!selectedCustomer?.email}
                  data-testid="button-send-email">
                  <Mail className="h-4 w-4 mr-1" /> Email
                </Button>
                <Button variant={sendMethod === "both" ? "default" : "outline"} size="sm"
                  onClick={() => setSendMethod("both")}
                  disabled={!selectedCustomer?.phone || !selectedCustomer?.email}
                  data-testid="button-send-both">
                  Both
                </Button>
              </div>
            </div>
            {selectedCustomer?.phone && (sendMethod === "sms" || sendMethod === "both") && (
              <div className="text-xs text-muted-foreground">
                SMS to: {selectedCustomer.phone}
              </div>
            )}
            {selectedCustomer?.email && (sendMethod === "email" || sendMethod === "both") && (
              <div className="text-xs text-muted-foreground">
                Email to: {selectedCustomer.email}
              </div>
            )}
            <div className="rounded-md border p-3 text-sm bg-muted/50">
              <div className="font-medium mb-1">Estimate Summary</div>
              <div>Total: ${parseFloat(ro?.totalCash || "0").toFixed(2)}</div>
              <div>{lineItems.length} line item{lineItems.length !== 1 ? "s" : ""}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendEstimateOpen(false)} data-testid="button-cancel-send">
              Cancel
            </Button>
            <Button onClick={handleSendEstimate} disabled={sendingEstimate} data-testid="button-confirm-send">
              {sendingEstimate ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Send Estimate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeValidationOpen} onOpenChange={setCloseValidationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Close Repair Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The following issues were found. Please review before closing:
            </p>
            <div className="space-y-2">
              {closeWarnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 rounded-md border p-3 text-sm"
                  data-testid={`text-close-warning-${idx}`}
                >
                  <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setCloseValidationOpen(false); setCloseWarnings([]); }}
              data-testid="button-cancel-close"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmClose}
              disabled={closingRO}
              data-testid="button-close-anyway"
            >
              {closingRO ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Close Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AutoLayout>
  );
}
