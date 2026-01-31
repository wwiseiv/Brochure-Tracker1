import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Send,
  FileText,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  FileSignature,
  Loader2,
  Plus,
  Trash2,
  Download,
  RefreshCw,
  Ban
} from "lucide-react";

interface FormFieldDefinition {
  id: string;
  fieldName: string;
  label: string;
  type: string;
  required: boolean;
  mappedFrom?: string;
}

interface Signer {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  signedAt?: string;
}

interface ESignRequestDetail {
  id: number;
  status: string;
  merchantId?: number;
  merchantName: string;
  merchantEmail: string;
  merchantPhone?: string;
  documentIds: string[];
  packageId?: string;
  fieldValues: Record<string, string>;
  signers: Signer[];
  providerRequestId?: string;
  signingUrl?: string;
  createdAt: string;
  sentAt?: string;
  completedAt?: string;
  expiresAt?: string;
}

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  formFields: FormFieldDefinition[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  pending_send: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  viewed: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  partially_signed: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  declined: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  expired: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  voided: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
};

const SIGNER_ROLES = [
  { value: "merchant_owner", label: "Merchant Owner" },
  { value: "merchant_officer", label: "Authorized Officer" },
  { value: "guarantor", label: "Guarantor" },
  { value: "agent", label: "Agent" }
];

export default function ESignRequestDetailPage() {
  const [, params] = useRoute("/esign/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const requestId = params?.id;

  const [showAddSignerDialog, setShowAddSignerDialog] = useState(false);
  const [newSignerName, setNewSignerName] = useState("");
  const [newSignerEmail, setNewSignerEmail] = useState("");
  const [newSignerRole, setNewSignerRole] = useState("merchant_owner");
  const [editedFieldValues, setEditedFieldValues] = useState<Record<string, string>>({});
  const [hasFieldChanges, setHasFieldChanges] = useState(false);

  const { data: request, isLoading } = useQuery<ESignRequestDetail>({
    queryKey: ["/api/esign/requests", requestId],
    enabled: !!requestId
  });

  const { data: templates = [] } = useQuery<DocumentTemplate[]>({
    queryKey: ["/api/esign/templates"]
  });

  const updateFieldsMutation = useMutation({
    mutationFn: async (fieldValues: Record<string, string>) => {
      const response = await apiRequest("PATCH", `/api/esign/requests/${requestId}/fields`, { fieldValues });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Fields Updated", description: "Form field values have been saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/esign/requests", requestId] });
      setHasFieldChanges(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update fields", variant: "destructive" });
    }
  });

  const addSignerMutation = useMutation({
    mutationFn: async (signer: { name: string; email: string; role: string }) => {
      const response = await apiRequest("POST", `/api/esign/requests/${requestId}/signers`, signer);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Signer Added", description: "New signer has been added to the request" });
      queryClient.invalidateQueries({ queryKey: ["/api/esign/requests", requestId] });
      setShowAddSignerDialog(false);
      setNewSignerName("");
      setNewSignerEmail("");
      setNewSignerRole("merchant_owner");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add signer", variant: "destructive" });
    }
  });

  const removeSignerMutation = useMutation({
    mutationFn: async (signerId: string) => {
      const response = await apiRequest("DELETE", `/api/esign/requests/${requestId}/signers/${signerId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Signer Removed", description: "Signer has been removed from the request" });
      queryClient.invalidateQueries({ queryKey: ["/api/esign/requests", requestId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove signer", variant: "destructive" });
    }
  });

  const sendRequestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/esign/requests/${requestId}/send`, {});
      let data: any;
      try {
        data = await response.json();
      } catch {
        const text = await response.text().catch(() => "Unknown error");
        throw new Error(text || "Failed to send request");
      }
      if (!response.ok) {
        throw new Error(data?.error || "Failed to send request");
      }
      return data;
    },
    onSuccess: () => {
      toast({ title: "Request Sent", description: "E-signature request has been sent to all signers" });
      queryClient.invalidateQueries({ queryKey: ["/api/esign/requests", requestId] });
      queryClient.invalidateQueries({ queryKey: ["/api/esign/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/esign/stats"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to send request", variant: "destructive" });
    }
  });

  const voidRequestMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await apiRequest("POST", `/api/esign/requests/${requestId}/void`, { reason });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Request Voided", description: "E-signature request has been voided" });
      queryClient.invalidateQueries({ queryKey: ["/api/esign/requests", requestId] });
      queryClient.invalidateQueries({ queryKey: ["/api/esign/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/esign/stats"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to void request", variant: "destructive" });
    }
  });

  const refreshStatusMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", `/api/esign/requests/${requestId}/status`, undefined);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/esign/requests", requestId] });
      toast({ title: "Status Refreshed", description: "Request status has been updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to refresh status", variant: "destructive" });
    }
  });

  const getDocumentTemplates = () => {
    if (!request) return [];
    return templates.filter(t => request.documentIds.includes(t.id));
  };

  const getAllFormFields = () => {
    const docTemplates = getDocumentTemplates();
    const allFields: FormFieldDefinition[] = [];
    const seenFields = new Set<string>();
    
    docTemplates.forEach(doc => {
      doc.formFields?.forEach(field => {
        if (!seenFields.has(field.fieldName)) {
          seenFields.add(field.fieldName);
          allFields.push(field);
        }
      });
    });
    
    return allFields;
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setEditedFieldValues(prev => ({ ...prev, [fieldName]: value }));
    setHasFieldChanges(true);
  };

  const handleSaveFields = () => {
    const mergedFields = { ...request?.fieldValues, ...editedFieldValues };
    updateFieldsMutation.mutate(mergedFields);
  };

  const handleAddSigner = () => {
    if (!newSignerName.trim() || !newSignerEmail.trim()) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    addSignerMutation.mutate({
      name: newSignerName,
      email: newSignerEmail,
      role: newSignerRole
    });
  };

  const handleSendRequest = () => {
    if (!request?.signers || request.signers.length === 0) {
      toast({ title: "Error", description: "Please add at least one signer", variant: "destructive" });
      return;
    }
    sendRequestMutation.mutate();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const getSignerStatusIcon = (status: string) => {
    switch (status) {
      case "signed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "viewed":
        return <Eye className="w-4 h-4 text-purple-600" />;
      case "declined":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const canEdit = request?.status === "draft";
  const canSend = request?.status === "draft" && request.signers && request.signers.length > 0;
  const canVoid = request?.status === "sent" || request?.status === "viewed" || request?.status === "partially_signed";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto p-4 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">Request not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/esign")}>
            Back to E-Sign
          </Button>
        </Card>
      </div>
    );
  }

  const docTemplates = getDocumentTemplates();
  const formFields = getAllFormFields();

  return (
    <div className="min-h-screen bg-background pb-24 overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/esign")} data-testid="button-back-esign">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">E-Sign Request #{request.id}</h1>
              <p className="text-sm text-muted-foreground">{request.merchantName}</p>
            </div>
            <Badge className={STATUS_COLORS[request.status]}>
              {formatStatus(request.status)}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Request Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Merchant</Label>
                <p className="font-medium truncate">{request.merchantName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Email</Label>
                <p className="font-medium truncate">{request.merchantEmail || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Created</Label>
                <p className="font-medium">{formatDate(request.createdAt)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Status</Label>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[request.status]}>
                    {formatStatus(request.status)}
                  </Badge>
                  {request.status !== "draft" && request.status !== "completed" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refreshStatusMutation.mutate()}
                      disabled={refreshStatusMutation.isPending}
                      data-testid="button-refresh-status"
                    >
                      {refreshStatusMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
              {request.sentAt && (
                <div>
                  <Label className="text-muted-foreground">Sent</Label>
                  <p className="font-medium">{formatDate(request.sentAt)}</p>
                </div>
              )}
              {request.completedAt && (
                <div>
                  <Label className="text-muted-foreground">Completed</Label>
                  <p className="font-medium">{formatDate(request.completedAt)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5" />
              Documents ({docTemplates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {docTemplates.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-muted-foreground">{doc.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {formFields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Form Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formFields.map(field => (
                  <div key={field.fieldName} className="space-y-1">
                    <Label className="text-sm">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <Input
                      value={editedFieldValues[field.fieldName] ?? request.fieldValues?.[field.fieldName] ?? ""}
                      onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
                      disabled={!canEdit}
                      placeholder={field.mappedFrom ? `Auto-mapped from ${field.mappedFrom}` : ""}
                      data-testid={`input-field-${field.fieldName}`}
                    />
                  </div>
                ))}
              </div>
              {canEdit && hasFieldChanges && (
                <Button
                  onClick={handleSaveFields}
                  disabled={updateFieldsMutation.isPending}
                  data-testid="button-save-fields"
                >
                  {updateFieldsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Signers ({request.signers?.length || 0})
              </CardTitle>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddSignerDialog(true)}
                  data-testid="button-add-signer"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Signer
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {request.signers && request.signers.length > 0 ? (
              <div className="space-y-3">
                {request.signers.map((signer) => (
                  <div key={signer.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3 min-w-0">
                      {getSignerStatusIcon(signer.status)}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{signer.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{signer.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {SIGNER_ROLES.find(r => r.value === signer.role)?.label || signer.role}
                      </Badge>
                      <Badge className={STATUS_COLORS[signer.status] || STATUS_COLORS.draft}>
                        {formatStatus(signer.status)}
                      </Badge>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSignerMutation.mutate(signer.id)}
                          disabled={removeSignerMutation.isPending}
                          data-testid={`button-remove-signer-${signer.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No signers added yet</p>
                {canEdit && (
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => setShowAddSignerDialog(true)}
                    data-testid="button-add-first-signer"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Signer
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-40">
        <div className="container max-w-4xl mx-auto flex gap-3">
          {canSend && (
            <Button
              className="flex-1 min-h-touch gap-2"
              onClick={handleSendRequest}
              disabled={sendRequestMutation.isPending}
              data-testid="button-send-request"
            >
              {sendRequestMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send for Signature
            </Button>
          )}
          {request.status === "completed" && (
            <Button
              variant="outline"
              className="flex-1 min-h-touch gap-2"
              onClick={() => window.open(`/api/esign/requests/${requestId}/download`, "_blank")}
              data-testid="button-download-documents"
            >
              <Download className="w-4 h-4" />
              Download Documents
            </Button>
          )}
          {canVoid && (
            <Button
              variant="destructive"
              className="flex-1 min-h-touch gap-2"
              onClick={() => voidRequestMutation.mutate("Voided by agent")}
              disabled={voidRequestMutation.isPending}
              data-testid="button-void-request"
            >
              {voidRequestMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Ban className="w-4 h-4" />
              )}
              Void Request
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showAddSignerDialog} onOpenChange={setShowAddSignerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Signer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={newSignerName}
                onChange={(e) => setNewSignerName(e.target.value)}
                placeholder="John Smith"
                data-testid="input-signer-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={newSignerEmail}
                onChange={(e) => setNewSignerEmail(e.target.value)}
                placeholder="john@example.com"
                data-testid="input-signer-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newSignerRole} onValueChange={setNewSignerRole}>
                <SelectTrigger data-testid="select-signer-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIGNER_ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSignerDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSigner}
              disabled={addSignerMutation.isPending}
              data-testid="button-confirm-add-signer"
            >
              {addSignerMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Signer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
