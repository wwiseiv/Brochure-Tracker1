import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  Building2,
  Phone,
  Globe,
  Loader2,
  MapPin,
  ChevronRight,
  Filter,
  Sparkles,
  MessageSquare,
  Check,
  Clock,
  TrendingUp,
  XCircle,
  Target,
  FileText,
  Trash2,
  ExternalLink,
  Navigation,
  Mail,
  User,
} from "lucide-react";
import { format } from "date-fns";

interface Prospect {
  id: number;
  businessName: string;
  dbaName: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  zipCode: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  mccCode: string | null;
  mccDescription: string | null;
  businessType: string | null;
  hoursOfOperation: string | null;
  ownerName: string | null;
  yearEstablished: string | null;
  businessDescription: string | null;
  status: string;
  notes: string | null;
  nextFollowupDate: string | null;
  contactAttempts: number;
  createdAt: string;
  updatedAt: string;
  convertedToMerchantId: number | null;
}

interface PipelineSummary {
  counts: {
    discovered: number;
    contacted: number;
    qualified: number;
    proposal_sent: number;
    negotiating: number;
    won: number;
    lost: number;
    disqualified: number;
  };
  total: number;
  upcomingFollowups: Prospect[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  discovered: { label: "Discovered", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: Search },
  contacted: { label: "Contacted", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", icon: Phone },
  qualified: { label: "Qualified", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", icon: Target },
  proposal_sent: { label: "Proposal Sent", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300", icon: FileText },
  negotiating: { label: "Negotiating", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", icon: MessageSquare },
  won: { label: "Won", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: Check },
  lost: { label: "Lost", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
  disqualified: { label: "Disqualified", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300", icon: XCircle },
};

export default function ProspectPipelinePage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [editingStatus, setEditingStatus] = useState("");
  const [editingNotes, setEditingNotes] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pipeline, isLoading: loadingPipeline } = useQuery<PipelineSummary>({
    queryKey: ["/api/prospects/pipeline"],
  });

  const prospectsQueryKey = statusFilter === "all" 
    ? "/api/prospects" 
    : `/api/prospects?status=${statusFilter}`;
    
  const { data: prospectsData, isLoading: loadingProspects } = useQuery<{
    prospects: Prospect[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>({
    queryKey: [prospectsQueryKey],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/prospects/${id}`, updates);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prospects/pipeline"] });
      toast({ title: "Prospect updated" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/prospects/${id}/convert`);
      return await response.json();
    },
    onSuccess: (data: { merchant: { businessName: string } }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prospects/pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchants"] });
      setSelectedProspect(null);
      toast({ 
        title: "Converted to Merchant!", 
        description: `${data.merchant.businessName} is now a merchant record.` 
      });
    },
    onError: () => {
      toast({ title: "Failed to convert", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/prospects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prospects/pipeline"] });
      setSelectedProspect(null);
      toast({ title: "Prospect released" });
    },
    onError: () => {
      toast({ title: "Failed to delete", variant: "destructive" });
    },
  });

  const handleOpenProspect = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setEditingStatus(prospect.status);
    setEditingNotes(prospect.notes || "");
  };

  const handleSaveChanges = () => {
    if (!selectedProspect) return;
    updateMutation.mutate({
      id: selectedProspect.id,
      updates: {
        status: editingStatus,
        notes: editingNotes,
      },
    });
  };

  const filteredProspects = prospectsData?.prospects.filter((p) =>
    p.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const isLoading = loadingPipeline || loadingProspects;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              <h1 className="text-lg font-semibold">My Pipeline</h1>
            </div>
          </div>
          <Link href="/prospects/search">
            <Button variant="outline" size="sm" className="gap-1" data-testid="button-find-more">
              <Sparkles className="w-4 h-4" />
              Find More
            </Button>
          </Link>
        </div>
      </header>

      <main className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-6 space-y-6">
        {loadingPipeline ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{pipeline?.counts.discovered || 0}</p>
              <p className="text-xs text-muted-foreground">New</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{pipeline?.counts.contacted || 0}</p>
              <p className="text-xs text-muted-foreground">Contacted</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{pipeline?.counts.qualified || 0}</p>
              <p className="text-xs text-muted-foreground">Qualified</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{pipeline?.counts.won || 0}</p>
              <p className="text-xs text-muted-foreground">Won</p>
            </Card>
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search prospects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-pipeline"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="discovered">Discovered</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
              <SelectItem value="negotiating">Negotiating</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredProspects.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Prospects Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Use the Prospect Finder to discover local businesses
            </p>
            <Link href="/prospects/search">
              <Button className="gap-2" data-testid="button-find-prospects">
                <Sparkles className="w-4 h-4" />
                Find Prospects
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProspects.map((prospect) => {
              const statusConfig = STATUS_CONFIG[prospect.status] || STATUS_CONFIG.discovered;
              const StatusIcon = statusConfig.icon;

              return (
                <Card
                  key={prospect.id}
                  className="p-4 cursor-pointer hover-elevate"
                  onClick={() => handleOpenProspect(prospect)}
                  data-testid={`prospect-card-${prospect.id}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{prospect.businessName}</h3>
                        <Badge className={`text-xs ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {prospect.city}, {prospect.state} {prospect.zipCode}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                    {prospect.businessType && (
                      <Badge variant="outline">{prospect.businessType}</Badge>
                    )}
                    {prospect.contactAttempts > 0 && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {prospect.contactAttempts} contacts
                      </span>
                    )}
                    {prospect.nextFollowupDate && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Clock className="w-3 h-3" />
                        Follow-up: {format(new Date(prospect.nextFollowupDate), "MMM d")}
                      </span>
                    )}
                  </div>
                  
                  {/* Quick Action Buttons */}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        const address = `${prospect.addressLine1 || ""}, ${prospect.city}, ${prospect.state} ${prospect.zipCode}`;
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank", "noopener,noreferrer");
                      }}
                      data-testid={`button-directions-${prospect.id}`}
                    >
                      <Navigation className="w-4 h-4 mr-1" />
                      Directions
                    </Button>
                    {prospect.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`tel:${prospect.phone}`, "_self");
                        }}
                        data-testid={`button-call-${prospect.id}`}
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Sheet open={!!selectedProspect} onOpenChange={() => setSelectedProspect(null)}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          {selectedProspect && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle>{selectedProspect.businessName}</SheetTitle>
              </SheetHeader>

              <div className="space-y-6 pb-24">
                {/* Quick Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      const address = `${selectedProspect.addressLine1 || ""}, ${selectedProspect.city}, ${selectedProspect.state} ${selectedProspect.zipCode}`;
                      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank", "noopener,noreferrer");
                    }}
                    data-testid="button-detail-directions"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Get Directions
                  </Button>
                  {selectedProspect.phone && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => window.open(`tel:${selectedProspect.phone}`, "_self")}
                      data-testid="button-detail-call"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Call Now
                    </Button>
                  )}
                </div>

                {/* Contact Information */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Contact Information</h4>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {selectedProspect.addressLine1}, {selectedProspect.city}, {selectedProspect.state} {selectedProspect.zipCode}
                    </span>
                  </div>
                  {selectedProspect.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a href={`tel:${selectedProspect.phone}`} className="text-primary">
                        {selectedProspect.phone}
                      </a>
                    </div>
                  )}
                  {selectedProspect.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${selectedProspect.email}`} className="text-primary">
                        {selectedProspect.email}
                      </a>
                    </div>
                  )}
                  {selectedProspect.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <a
                        href={selectedProspect.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary flex items-center gap-1"
                      >
                        Visit Website
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Business Details */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Business Details</h4>
                  {selectedProspect.businessType && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <Badge variant="outline">{selectedProspect.businessType}</Badge>
                      {selectedProspect.yearEstablished && (
                        <Badge variant="secondary">Est. {selectedProspect.yearEstablished}</Badge>
                      )}
                    </div>
                  )}
                  {selectedProspect.ownerName && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>Owner: <span className="text-foreground font-medium">{selectedProspect.ownerName}</span></span>
                    </div>
                  )}
                  {selectedProspect.hoursOfOperation && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{selectedProspect.hoursOfOperation}</span>
                    </div>
                  )}
                  {selectedProspect.businessDescription && (
                    <p className="text-sm text-muted-foreground italic bg-muted/50 p-3 rounded-md">
                      {selectedProspect.businessDescription}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={editingStatus} onValueChange={setEditingStatus}>
                    <SelectTrigger data-testid="select-edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discovered">Discovered</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                      <SelectItem value="negotiating">Negotiating</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                      <SelectItem value="disqualified">Disqualified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Notes</label>
                  <Textarea
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="Add notes about this prospect..."
                    rows={4}
                    data-testid="textarea-notes"
                  />
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Contact Attempts: {selectedProspect.contactAttempts}</span>
                  <span>Added: {format(new Date(selectedProspect.createdAt), "MMM d, yyyy")}</span>
                </div>
              </div>

              <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t space-y-2">
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={handleSaveChanges}
                    disabled={updateMutation.isPending}
                    data-testid="button-save-changes"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                  {!selectedProspect.convertedToMerchantId && (
                    <Button
                      variant="outline"
                      onClick={() => convertMutation.mutate(selectedProspect.id)}
                      disabled={convertMutation.isPending}
                      data-testid="button-convert-merchant"
                    >
                      {convertMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TrendingUp className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(selectedProspect.id)}
                  disabled={deleteMutation.isPending}
                  data-testid="button-release-prospect"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Release Prospect
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
}
