import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, MessageCircle, FileText } from "lucide-react";

interface EstimateData {
  repairOrder: any;
  customer: any;
  vehicle: any;
  shop: any;
  lineItems: any[];
}

export default function AutoPublicApproval() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [data, setData] = useState<EstimateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [approveOpen, setApproveOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [questionText, setQuestionText] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchEstimate();
  }, [token]);

  async function fetchEstimate() {
    try {
      setLoading(true);
      const res = await fetch(`/api/auto/public/estimate/${token}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const result = await res.json();
      setData(result);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!data) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auto/public/estimate/${token}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName || undefined,
          approvedItemIds: data.lineItems.map((i) => i.id),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setApproveOpen(false);
      setSubmitted(true);
      setActionMessage({ type: "success", text: "Estimate approved successfully!" });
      fetchEstimate();
    } catch {
      setActionMessage({ type: "error", text: "Failed to approve. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auto/public/estimate/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason || undefined }),
      });
      if (!res.ok) throw new Error("Failed");
      setDeclineOpen(false);
      setSubmitted(true);
      setActionMessage({ type: "success", text: "Estimate declined." });
      fetchEstimate();
    } catch {
      setActionMessage({ type: "error", text: "Failed to decline. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuestion() {
    if (!questionText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auto/public/estimate/${token}/question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionText }),
      });
      if (!res.ok) throw new Error("Failed");
      setQuestionOpen(false);
      setSubmitted(true);
      setActionMessage({ type: "success", text: "Your question has been sent to the shop." });
      fetchEstimate();
    } catch {
      setActionMessage({ type: "error", text: "Failed to send question. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading estimate...</p>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Estimate Not Found</h2>
            <p className="text-sm text-muted-foreground">
              This estimate link is invalid or has expired. Please contact the shop for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { repairOrder: ro, customer, vehicle, shop, lineItems } = data;
  const isApproved = ro.status === "approved" || !!ro.approvedAt;
  const isDeclined = !!ro.approvalDeclinedAt && !isApproved;
  const hasQuestion = !!ro.approvalQuestionAt;
  const showActions = ro.status === "estimate" || isDeclined;

  const typeBadgeVariant = (type: string) => {
    switch (type?.toLowerCase()) {
      case "labor": return "default";
      case "parts": return "secondary";
      case "sublet": return "outline";
      case "fee": return "outline";
      default: return "secondary";
    }
  };

  const formatCurrency = (val: string | number | null | undefined) => {
    const num = parseFloat(String(val || "0"));
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-1">
              {shop.logoUrl && (
                <img src={shop.logoUrl} alt={shop.name} className="h-10 w-auto object-contain mb-2" />
              )}
              <CardTitle data-testid="text-shop-name" className="text-xl">
                {shop.name}
              </CardTitle>
              {(shop.address || shop.city) && (
                <p className="text-sm text-muted-foreground">
                  {[shop.address, shop.city, shop.state, shop.zip].filter(Boolean).join(", ")}
                </p>
              )}
              {shop.phone && (
                <p className="text-sm text-muted-foreground">{shop.phone}</p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-fit"
                data-testid="button-download-pdf"
                onClick={() => window.open(`/api/auto/public/estimate/${token}/pdf`, "_blank")}
              >
                <FileText className="h-4 w-4 mr-1" />
                Download Estimate PDF
              </Button>
            </div>
          </CardHeader>
        </Card>

        {isApproved && (
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3" data-testid="text-approval-status">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-300">This estimate has been approved</p>
                  {ro.approvedAt && (
                    <p className="text-sm text-muted-foreground">
                      Approved on {formatDate(ro.approvedAt)}
                      {ro.approvedBy ? ` by ${ro.approvedBy}` : ""}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isDeclined && (
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3" data-testid="text-approval-status">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-300">This estimate was declined</p>
                  {ro.approvalDeclinedReason && (
                    <p className="text-sm text-muted-foreground">Reason: {ro.approvalDeclinedReason}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasQuestion && (
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <p className="font-medium text-blue-700 dark:text-blue-300">Your question has been sent</p>
                  {ro.approvalQuestion && (
                    <p className="text-sm text-muted-foreground">"{ro.approvalQuestion}"</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {actionMessage && (
          <Card className={actionMessage.type === "success" ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}>
            <CardContent className="pt-4 pb-4">
              <p className={`text-sm font-medium ${actionMessage.type === "success" ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                {actionMessage.text}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Estimate Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">RO Number</p>
                <p className="font-medium" data-testid="text-ro-number">{ro.roNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">{formatDate(ro.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium">
                  {customer?.firstName} {customer?.lastName}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vehicle</p>
                <p className="font-medium" data-testid="text-vehicle-info">
                  {[vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(" ")}
                </p>
                {vehicle?.vin && (
                  <p className="text-xs text-muted-foreground">VIN: {vehicle.vin}</p>
                )}
              </div>
            </div>
            {ro.customerConcern && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Customer Concern</p>
                <p className="text-sm">{ro.customerConcern}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="hidden sm:grid grid-cols-[1fr_60px_80px_80px] gap-2 pb-2 border-b text-xs text-muted-foreground font-medium">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Price</span>
              <span className="text-right">Total</span>
            </div>
            <div className="divide-y">
              {lineItems.map((item) => (
                <div key={item.id} className="py-3">
                  <div className="hidden sm:grid grid-cols-[1fr_60px_80px_80px] gap-2 items-start">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm">{item.description}</span>
                      <Badge variant={typeBadgeVariant(item.type)} className="text-xs capitalize">
                        {item.type}
                      </Badge>
                      {item.isNtnf && (
                        <Badge variant="outline" className="text-xs">NTNF</Badge>
                      )}
                    </div>
                    <span className="text-sm text-right">{parseFloat(item.quantity || "1")}</span>
                    <span className="text-sm text-right">{formatCurrency(item.unitPriceCash)}</span>
                    <span className="text-sm font-medium text-right">{formatCurrency(item.totalCash)}</span>
                  </div>
                  <div className="sm:hidden space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">{item.description}</span>
                      <Badge variant={typeBadgeVariant(item.type)} className="text-xs capitalize">
                        {item.type}
                      </Badge>
                      {item.isNtnf && (
                        <Badge variant="outline" className="text-xs">NTNF</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                      <span>Qty: {parseFloat(item.quantity || "1")} x {formatCurrency(item.unitPriceCash)}</span>
                      <span className="font-medium text-foreground">{formatCurrency(item.totalCash)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 mt-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(ro.subtotalCash)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(ro.taxAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-base font-semibold pt-1 border-t">
                <span>Total</span>
                <span>{formatCurrency(ro.totalCash)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {showActions && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  data-testid="button-approve"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setApproveOpen(true)}
                  disabled={submitted || submitting}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Estimate
                </Button>
                {!isDeclined && (
                  <Button
                    data-testid="button-decline"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setDeclineOpen(true)}
                    disabled={submitted || submitting}
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <XCircle className="mr-2 h-4 w-4" />
                    Decline
                  </Button>
                )}
                <Button
                  data-testid="button-question"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setQuestionOpen(true)}
                  disabled={submitted || submitting}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Ask a Question
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Estimate</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Please confirm your approval for this estimate totaling {formatCurrency(ro.totalCash)}.
              </p>
              <div className="space-y-2">
                <Label htmlFor="approve-name">Your Name</Label>
                <Input
                  id="approve-name"
                  data-testid="input-approve-name"
                  placeholder="Enter your name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleApprove}
                disabled={submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Approval
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Decline Estimate</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to decline this estimate? You can optionally provide a reason.
              </p>
              <div className="space-y-2">
                <Label htmlFor="decline-reason">Reason (optional)</Label>
                <Textarea
                  id="decline-reason"
                  data-testid="input-decline-reason"
                  placeholder="Let us know why you're declining..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeclineOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDecline}
                disabled={submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Decline
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={questionOpen} onOpenChange={setQuestionOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ask a Question</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Have a question about this estimate? Send it to the shop and they'll get back to you.
              </p>
              <div className="space-y-2">
                <Label htmlFor="question-text">Your Question</Label>
                <Textarea
                  id="question-text"
                  data-testid="input-question"
                  placeholder="Type your question here..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setQuestionOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={handleQuestion}
                disabled={submitting || !questionText.trim()}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Question
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Powered by PCB Auto
        </p>
      </div>
    </div>
  );
}