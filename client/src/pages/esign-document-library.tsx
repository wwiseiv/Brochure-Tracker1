import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Merchant, Deal } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft,
  FileText, 
  Package, 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  ChevronRight,
  Search,
  Plus,
  Users,
  FileSignature,
  AlertCircle,
  Loader2,
  FilePlus2,
  Link2,
  Settings,
  Unlink
} from "lucide-react";

interface FormFieldDefinition {
  id: string;
  fieldName: string;
  label: string;
  type: string;
  required: boolean;
  mappedFrom?: string;
}

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnailPath: string;
  formFields: FormFieldDefinition[];
  isRequired: boolean;
  sortOrder: number;
  signNowTemplateId?: string | null;
}

interface SignNowTemplate {
  id: string;
  name: string;
  created: string;
  updated: string;
  page_count?: number;
}

interface DocumentPackage {
  id: string;
  name: string;
  description: string;
  documentTemplateIds: string[];
  isDefault: boolean;
}

interface ESignRequest {
  id: number;
  merchantName: string;
  merchantEmail: string;
  status: string;
  documentIds: string[];
  signers: { name: string; email: string; role: string; status: string }[];
  createdAt: string;
  sentAt?: string;
  completedAt?: string;
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

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <FileText className="w-4 h-4" />,
  pending_send: <Clock className="w-4 h-4" />,
  sent: <Send className="w-4 h-4" />,
  viewed: <Eye className="w-4 h-4" />,
  partially_signed: <FileSignature className="w-4 h-4" />,
  completed: <CheckCircle2 className="w-4 h-4" />,
  declined: <XCircle className="w-4 h-4" />,
  expired: <AlertCircle className="w-4 h-4" />,
  voided: <XCircle className="w-4 h-4" />
};

const CATEGORY_LABELS: Record<string, string> = {
  application: "Applications",
  equipment: "Equipment",
  compliance: "Compliance",
  addendum: "Addendums",
  internal: "Internal"
};

export default function ESignDocumentLibrary() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("templates");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [merchantName, setMerchantName] = useState("");
  const [merchantEmail, setMerchantEmail] = useState("");
  const [selectedMerchantId, setSelectedMerchantId] = useState<number | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string>("");
  
  // SignNow template linking state
  const [showTemplateLinkDialog, setShowTemplateLinkDialog] = useState(false);
  const [templateToLink, setTemplateToLink] = useState<DocumentTemplate | null>(null);
  const [selectedSignNowTemplate, setSelectedSignNowTemplate] = useState<string>("");

  // Parse merchantId from URL query string
  const urlParams = new URLSearchParams(searchString);
  const merchantIdParam = urlParams.get("merchantId");

  // Fetch templates
  const { data: templates = [], isLoading: loadingTemplates } = useQuery<DocumentTemplate[]>({
    queryKey: ["/api/esign/templates"]
  });

  // Fetch packages
  const { data: packages = [], isLoading: loadingPackages } = useQuery<DocumentPackage[]>({
    queryKey: ["/api/esign/packages"]
  });

  // Fetch requests
  const { data: requests = [], isLoading: loadingRequests } = useQuery<ESignRequest[]>({
    queryKey: ["/api/esign/requests"]
  });

  // Fetch stats
  const { data: stats } = useQuery<{
    total: number;
    draft: number;
    sent: number;
    completed: number;
    declined: number;
    expired: number;
  }>({
    queryKey: ["/api/esign/stats"]
  });

  // Fetch deals for linking
  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"]
  });

  // Fetch SignNow templates from user's account
  const { data: signNowTemplates = [], isLoading: loadingSignNowTemplates } = useQuery<SignNowTemplate[]>({
    queryKey: ["/api/esign/signnow/templates"],
    enabled: showTemplateLinkDialog,
    select: (data: any) => data?.templates || []
  });

  // Link SignNow template mutation
  const linkTemplateMutation = useMutation({
    mutationFn: async ({ templateId, signNowTemplateId }: { templateId: string; signNowTemplateId: string | null }) => {
      const response = await apiRequest("POST", `/api/esign/templates/${templateId}/link-signnow`, { signNowTemplateId });
      return { ...(await response.json()), wasLinked: !!signNowTemplateId };
    },
    onSuccess: (data) => {
      toast({
        title: data.wasLinked ? "Template Linked" : "Template Unlinked",
        description: "Document template updated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/esign/templates"] });
      setShowTemplateLinkDialog(false);
      setTemplateToLink(null);
      setSelectedSignNowTemplate("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update template link",
        variant: "destructive"
      });
    }
  });

  // Fetch merchant data if merchantId is provided
  const { data: merchantFromUrl } = useQuery<Merchant>({
    queryKey: ["/api/merchants", merchantIdParam],
    enabled: !!merchantIdParam
  });

  // Auto-populate merchant data and open dialog when coming from merchant page
  useEffect(() => {
    if (merchantFromUrl && merchantIdParam) {
      setMerchantName(merchantFromUrl.businessName);
      setMerchantEmail(merchantFromUrl.email || "");
      setSelectedMerchantId(merchantFromUrl.id);
      setShowNewRequestDialog(true);
      // Select default package
      const defaultPkg = packages.find(p => p.isDefault);
      if (defaultPkg) {
        setSelectedPackage(defaultPkg.id);
        setSelectedDocuments(defaultPkg.documentTemplateIds);
      }
    }
  }, [merchantFromUrl, merchantIdParam, packages]);

  // Create request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (data: {
      merchantName: string;
      merchantEmail: string;
      merchantId?: number;
      dealId?: number;
      packageId?: string;
      documentIds?: string[];
    }) => {
      const response = await apiRequest("POST", "/api/esign/requests", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Request Created",
        description: "E-signature request created successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/esign/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/esign/stats"] });
      setShowNewRequestDialog(false);
      resetNewRequestForm();
      setLocation(`/esign/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create request",
        variant: "destructive"
      });
    }
  });

  const resetNewRequestForm = () => {
    setSelectedPackage("");
    setSelectedDocuments([]);
    setMerchantName("");
    setMerchantEmail("");
    setSelectedMerchantId(null);
    setSelectedDealId("");
  };

  // Filter templates by category and search
  const filteredTemplates = templates.filter(t => {
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group templates by category
  const templatesByCategory = templates.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, DocumentTemplate[]>);

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackage(packageId);
    const pkg = packages.find(p => p.id === packageId);
    if (pkg) {
      setSelectedDocuments(pkg.documentTemplateIds);
    }
  };

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
    setSelectedPackage("");
  };

  const handleCreateRequest = () => {
    if (!merchantName.trim()) {
      toast({ title: "Error", description: "Please enter merchant name", variant: "destructive" });
      return;
    }
    if (!merchantEmail.trim()) {
      toast({ title: "Error", description: "Please enter merchant email", variant: "destructive" });
      return;
    }
    if (selectedDocuments.length === 0) {
      toast({ title: "Error", description: "Please select at least one document", variant: "destructive" });
      return;
    }

    createRequestMutation.mutate({
      merchantName,
      merchantEmail,
      merchantId: selectedMerchantId || undefined,
      dealId: selectedDealId ? parseInt(selectedDealId) : undefined,
      packageId: selectedPackage || undefined,
      documentIds: selectedDocuments
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const categories = Object.keys(templatesByCategory);

  return (
    <div className="flex flex-col h-full overflow-x-hidden">
      <div className="flex-shrink-0 bg-background border-b">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/")}
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold truncate">E-Sign Document Library</h1>
              <p className="text-sm text-muted-foreground line-clamp-1">Send merchant applications and agreements for electronic signature</p>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Card className="bg-blue-50 dark:bg-blue-950">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-muted-foreground">Sent</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 dark:bg-green-950">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">Completed</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50 dark:bg-yellow-950">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-muted-foreground">Pending</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.draft}</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-50 dark:bg-gray-900">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-muted-foreground">Total</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="templates" data-testid="tab-templates">
                <FileText className="w-4 h-4 mr-2" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="packages" data-testid="tab-packages">
                <Package className="w-4 h-4 mr-2" />
                Packages
              </TabsTrigger>
              <TabsTrigger value="requests" data-testid="tab-requests">
                <Send className="w-4 h-4 mr-2" />
                Requests
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "templates" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-documents"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredTemplates.map(template => (
                  <Card 
                    key={template.id} 
                    className="hover-elevate" 
                    data-testid={`card-template-${template.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div 
                          className="w-12 h-14 bg-muted rounded flex items-center justify-center flex-shrink-0 cursor-pointer"
                          onClick={() => {
                            setSelectedDocuments([template.id]);
                            setSelectedPackage("");
                            setShowNewRequestDialog(true);
                          }}
                        >
                          <FileText className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => {
                            setSelectedDocuments([template.id]);
                            setSelectedPackage("");
                            setShowNewRequestDialog(true);
                          }}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium">{template.name}</h3>
                            {template.isRequired && (
                              <Badge variant="secondary" className="text-xs">Required</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {CATEGORY_LABELS[template.category] || template.category}
                            </Badge>
                            {template.signNowTemplateId && (
                              <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <Link2 className="w-3 h-3 mr-1" />
                                SignNow
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {template.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {template.formFields.length} fields
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTemplateToLink(template);
                              setSelectedSignNowTemplate(template.signNowTemplateId || "none");
                              setShowTemplateLinkDialog(true);
                            }}
                            data-testid={`button-template-settings-${template.id}`}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <ChevronRight 
                            className="w-5 h-5 text-muted-foreground cursor-pointer" 
                            onClick={() => {
                              setSelectedDocuments([template.id]);
                              setSelectedPackage("");
                              setShowNewRequestDialog(true);
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "packages" && (
          <div className="space-y-4">
            {loadingPackages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-4">
                {packages.map(pkg => {
                  const pkgDocuments = templates.filter(t => pkg.documentTemplateIds.includes(t.id));
                  return (
                    <Card key={pkg.id} className="hover-elevate" data-testid={`card-package-${pkg.id}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary" />
                            {pkg.name}
                          </CardTitle>
                          {pkg.isDefault && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                        </div>
                        <CardDescription>{pkg.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Includes {pkgDocuments.length} documents:</p>
                          <div className="flex flex-wrap gap-2">
                            {pkgDocuments.map(doc => (
                              <Badge key={doc.id} variant="outline" className="text-xs">
                                {doc.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          className="w-full mt-4"
                          onClick={() => {
                            handleSelectPackage(pkg.id);
                            setShowNewRequestDialog(true);
                          }}
                          data-testid={`button-use-package-${pkg.id}`}
                        >
                          <FilePlus2 className="w-4 h-4 mr-2" />
                          Use This Package
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "requests" && (
          <div className="space-y-4">
            <Button
              onClick={() => setShowNewRequestDialog(true)}
              data-testid="button-new-request"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>

            {loadingRequests ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileSignature className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">No E-Signature Requests</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first e-signature request to send documents for signing
                  </p>
                  <Button onClick={() => setShowNewRequestDialog(true)} data-testid="button-create-first">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {requests.map(request => (
                  <Card
                    key={request.id}
                    className="hover-elevate cursor-pointer"
                    onClick={() => setLocation(`/esign/${request.id}`)}
                    data-testid={`card-request-${request.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium">{request.merchantName || "Unnamed Request"}</h3>
                            <Badge className={STATUS_COLORS[request.status]}>
                              {STATUS_ICONS[request.status]}
                              <span className="ml-1">{formatStatus(request.status)}</span>
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {request.merchantEmail}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {request.documentIds?.length || 0} docs
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {request.signers?.length || 0} signers
                            </span>
                            <span>Created {formatDate(request.createdAt)}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[90vh] mx-4 flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>New E-Signature Request</DialogTitle>
            <DialogDescription>
              Create a new request to send documents for electronic signature
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
            <div className="space-y-2">
              <Label htmlFor="merchantName">Merchant / Business Name</Label>
              <Input
                id="merchantName"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                placeholder="Enter business name"
                data-testid="input-merchant-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchantEmail">Merchant Email</Label>
              <Input
                id="merchantEmail"
                type="email"
                value={merchantEmail}
                onChange={(e) => setMerchantEmail(e.target.value)}
                placeholder="Enter email address"
                data-testid="input-merchant-email"
              />
            </div>

            <div className="space-y-2">
              <Label>Link to Deal (Optional)</Label>
              <Select value={selectedDealId || "none"} onValueChange={(val) => setSelectedDealId(val === "none" ? "" : val)}>
                <SelectTrigger data-testid="select-link-deal">
                  <SelectValue placeholder="Select a deal to link..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No deal selected</SelectItem>
                  {deals.map(deal => (
                    <SelectItem key={deal.id} value={String(deal.id)}>
                      {deal.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Link this e-sign request to a deal in your pipeline
              </p>
            </div>

            <div className="space-y-2">
              <Label>Document Package (Optional)</Label>
              <Select value={selectedPackage} onValueChange={handleSelectPackage}>
                <SelectTrigger data-testid="select-package">
                  <SelectValue placeholder="Select a package or choose documents below" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map(pkg => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <Label>Documents to Include</Label>
              <div className="border rounded-md divide-y flex-1 overflow-y-auto min-h-[120px]">
                {templates.map(template => (
                  <label
                    key={template.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocuments.includes(template.id)}
                      onChange={() => toggleDocumentSelection(template.id)}
                      className="rounded"
                      data-testid={`checkbox-doc-${template.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{template.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                    </div>
                    {template.isRequired && (
                      <Badge variant="secondary" className="text-xs flex-shrink-0">Required</Badge>
                    )}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedDocuments.length} document(s) selected
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4 flex-shrink-0 border-t mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowNewRequestDialog(false);
                resetNewRequestForm();
              }}
              className="flex-1"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRequest}
              disabled={createRequestMutation.isPending}
              className="flex-1"
              data-testid="button-create-request"
            >
              {createRequestMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Request
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SignNow Template Link Dialog */}
      <Dialog open={showTemplateLinkDialog} onOpenChange={(open) => {
        if (!open) {
          setShowTemplateLinkDialog(false);
          setTemplateToLink(null);
          setSelectedSignNowTemplate("");
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Link SignNow Template
            </DialogTitle>
            <DialogDescription>
              Link a SignNow template to "{templateToLink?.name}" for automated document creation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>SignNow Template</Label>
              {loadingSignNowTemplates ? (
                <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading templates from SignNow...</span>
                </div>
              ) : signNowTemplates.length === 0 ? (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No templates found in your SignNow account.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create templates in SignNow first, then link them here.
                  </p>
                </div>
              ) : (
                <Select value={selectedSignNowTemplate} onValueChange={setSelectedSignNowTemplate}>
                  <SelectTrigger data-testid="select-signnow-template">
                    <SelectValue placeholder="Select a SignNow template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template (generate PDF)</SelectItem>
                    {signNowTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {templateToLink?.signNowTemplateId && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-300">
                    Currently linked to SignNow template
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ID: {templateToLink.signNowTemplateId}
                </p>
              </div>
            )}

            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>When sending for signature, documents are created from the linked template</li>
                <li>Field values are pre-filled automatically</li>
                <li>If no template is linked, a PDF is generated instead</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowTemplateLinkDialog(false)}
              className="flex-1"
              data-testid="button-cancel-link"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (templateToLink) {
                  const signNowTemplateId = selectedSignNowTemplate === "none" ? null : selectedSignNowTemplate;
                  linkTemplateMutation.mutate({ templateId: templateToLink.id, signNowTemplateId });
                }
              }}
              disabled={linkTemplateMutation.isPending || !selectedSignNowTemplate}
              className="flex-1"
              data-testid="button-save-template-link"
            >
              {linkTemplateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : selectedSignNowTemplate === "none" ? (
                <>
                  <Unlink className="w-4 h-4 mr-2" />
                  Remove Link
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Link Template
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
