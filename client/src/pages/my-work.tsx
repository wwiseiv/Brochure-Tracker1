import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BottomNav, HamburgerMenu } from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  FileText,
  FileSpreadsheet,
  Download,
  Link as LinkIcon,
  ExternalLink,
  Briefcase,
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Merchant } from "@shared/schema";

type WorkType = "all" | "proposal" | "analysis";

interface WorkHistoryItem {
  type: "proposal" | "analysis";
  id: number;
  merchantName: string;
  merchantId: number | null;
  status?: string;
  createdAt: string;
  pdfUrl?: string;
  docxUrl?: string;
  processorName?: string;
  totalVolume?: number;
}

function WorkTableRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-8 w-20" /></TableCell>
    </TableRow>
  );
}

function MobileCardSkeleton() {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-4 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  
  const colorClasses = {
    draft: "bg-muted text-muted-foreground",
    generated: "bg-emerald-100 text-emerald-800",
    sent: "bg-blue-100 text-blue-800",
  }[status] || "bg-muted text-muted-foreground";

  return (
    <Badge variant="secondary" className={colorClasses}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function TypeBadge({ type }: { type: "proposal" | "analysis" }) {
  const isProposal = type === "proposal";
  return (
    <Badge 
      variant="secondary" 
      className={isProposal ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-800"}
    >
      {isProposal ? "Proposal" : "Analysis"}
    </Badge>
  );
}

function AssignMerchantDialog({ 
  item, 
  merchants,
  onAssign 
}: { 
  item: WorkHistoryItem;
  merchants: Merchant[];
  onAssign: (merchantId: number) => void;
}) {
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>("");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          data-testid={`button-assign-merchant-${item.id}`}
        >
          <LinkIcon className="w-3 h-3 mr-1" />
          Assign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign to Merchant</DialogTitle>
          <DialogDescription>
            Link this {item.type} to an existing merchant for better organization.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <Select value={selectedMerchantId} onValueChange={setSelectedMerchantId}>
            <SelectTrigger data-testid="select-merchant-assign">
              <SelectValue placeholder="Select a merchant" />
            </SelectTrigger>
            <SelectContent>
              {merchants.map((merchant) => (
                <SelectItem key={merchant.id} value={merchant.id.toString()}>
                  {merchant.businessName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => onAssign(parseInt(selectedMerchantId))}
            disabled={!selectedMerchantId}
            className="w-full"
            data-testid="button-confirm-assign"
          >
            Assign Merchant
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WorkHistoryRow({ 
  item, 
  merchants,
  onAssignMerchant 
}: { 
  item: WorkHistoryItem;
  merchants: Merchant[];
  onAssignMerchant: (itemId: number, itemType: string, merchantId: number) => void;
}) {
  const linkedMerchant = item.merchantId 
    ? merchants.find(m => m.id === item.merchantId) 
    : null;

  return (
    <TableRow data-testid={`row-work-${item.id}`}>
      <TableCell className="font-medium">{item.merchantName}</TableCell>
      <TableCell><TypeBadge type={item.type} /></TableCell>
      <TableCell className="text-muted-foreground">
        {format(new Date(item.createdAt), "MMM d, yyyy")}
      </TableCell>
      <TableCell>
        {item.type === "proposal" ? (
          <StatusBadge status={item.status} />
        ) : (
          <div className="text-sm">
            <div className="text-muted-foreground">{item.processorName}</div>
            {item.totalVolume && (
              <div className="text-xs text-muted-foreground">
                ${item.totalVolume.toLocaleString()} vol.
              </div>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>
        {linkedMerchant ? (
          <Link href={`/merchants/${linkedMerchant.id}`}>
            <Button variant="ghost" size="sm" className="text-primary">
              {linkedMerchant.businessName}
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        ) : (
          <AssignMerchantDialog 
            item={item} 
            merchants={merchants}
            onAssign={(merchantId) => onAssignMerchant(item.id, item.type, merchantId)}
          />
        )}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          {item.type === "proposal" && item.pdfUrl && (
            <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer">
              <Button 
                variant="outline" 
                size="sm"
                data-testid={`button-view-pdf-${item.id}`}
              >
                <FileText className="w-3 h-3 mr-1" />
                PDF
              </Button>
            </a>
          )}
          {item.type === "proposal" && item.docxUrl && (
            <a href={item.docxUrl} target="_blank" rel="noopener noreferrer">
              <Button 
                variant="outline" 
                size="sm"
                data-testid={`button-view-word-${item.id}`}
              >
                <FileSpreadsheet className="w-3 h-3 mr-1" />
                Word
              </Button>
            </a>
          )}
          {item.type === "analysis" && (
            <Link href={`/statement-analyzer?id=${item.id}`}>
              <Button 
                variant="outline" 
                size="sm"
                data-testid={`button-view-analysis-${item.id}`}
              >
                <FileText className="w-3 h-3 mr-1" />
                View
              </Button>
            </Link>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function MobileWorkCard({ 
  item, 
  merchants,
  onAssignMerchant 
}: { 
  item: WorkHistoryItem;
  merchants: Merchant[];
  onAssignMerchant: (itemId: number, itemType: string, merchantId: number) => void;
}) {
  const linkedMerchant = item.merchantId 
    ? merchants.find(m => m.id === item.merchantId) 
    : null;

  return (
    <Card className="p-4" data-testid={`row-work-${item.id}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium truncate flex-1">{item.merchantName}</h3>
        <TypeBadge type={item.type} />
      </div>
      
      <div className="text-sm text-muted-foreground mb-2">
        {format(new Date(item.createdAt), "MMM d, yyyy")}
      </div>

      {item.type === "proposal" ? (
        <div className="mb-3">
          <StatusBadge status={item.status} />
        </div>
      ) : (
        <div className="text-sm mb-3">
          <span className="text-muted-foreground">{item.processorName}</span>
          {item.totalVolume && (
            <span className="ml-2 text-muted-foreground">
              ${item.totalVolume.toLocaleString()} vol.
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-muted-foreground">Merchant:</span>
        {linkedMerchant ? (
          <Link href={`/merchants/${linkedMerchant.id}`}>
            <Button variant="ghost" size="sm" className="text-primary h-auto p-1">
              {linkedMerchant.businessName}
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {!linkedMerchant && (
          <AssignMerchantDialog 
            item={item} 
            merchants={merchants}
            onAssign={(merchantId) => onAssignMerchant(item.id, item.type, merchantId)}
          />
        )}
        {item.type === "proposal" && item.pdfUrl && (
          <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer">
            <Button 
              variant="outline" 
              size="sm"
              data-testid={`button-view-pdf-${item.id}`}
            >
              <FileText className="w-3 h-3 mr-1" />
              PDF
            </Button>
          </a>
        )}
        {item.type === "proposal" && item.docxUrl && (
          <a href={item.docxUrl} target="_blank" rel="noopener noreferrer">
            <Button 
              variant="outline" 
              size="sm"
              data-testid={`button-view-word-${item.id}`}
            >
              <FileSpreadsheet className="w-3 h-3 mr-1" />
              Word
            </Button>
          </a>
        )}
        {item.type === "analysis" && (
          <Link href={`/statement-analyzer?id=${item.id}`}>
            <Button 
              variant="outline" 
              size="sm"
              data-testid={`button-view-analysis-${item.id}`}
            >
              <FileText className="w-3 h-3 mr-1" />
              View
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}

export default function MyWorkPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<WorkType>("all");
  const { toast } = useToast();

  const { data: workHistory, isLoading } = useQuery<WorkHistoryItem[]>({
    queryKey: ["/api/work-history"],
  });

  const { data: merchants = [] } = useQuery<Merchant[]>({
    queryKey: ["/api/merchants"],
  });

  const assignProposalMerchantMutation = useMutation({
    mutationFn: async ({ proposalId, merchantId }: { proposalId: number; merchantId: number }) => {
      await apiRequest("PATCH", `/api/proposals/${proposalId}`, { merchantId });
      return merchantId;
    },
    onSuccess: (merchantId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchants", merchantId.toString(), "work"] });
      toast({ title: "Merchant assigned successfully" });
    },
    onError: () => {
      toast({ title: "Failed to assign merchant", variant: "destructive" });
    },
  });

  const assignAnalysisMerchantMutation = useMutation({
    mutationFn: async ({ analysisId, merchantId }: { analysisId: number; merchantId: number }) => {
      await apiRequest("PATCH", `/api/statement-analyses/${analysisId}`, { merchantId });
      return merchantId;
    },
    onSuccess: (merchantId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchants", merchantId.toString(), "work"] });
      toast({ title: "Merchant assigned successfully" });
    },
    onError: () => {
      toast({ title: "Failed to assign merchant", variant: "destructive" });
    },
  });

  const handleAssignMerchant = (itemId: number, itemType: string, merchantId: number) => {
    if (itemType === "proposal") {
      assignProposalMerchantMutation.mutate({ proposalId: itemId, merchantId });
    } else {
      assignAnalysisMerchantMutation.mutate({ analysisId: itemId, merchantId });
    }
  };

  const filteredItems = useMemo(() => {
    if (!workHistory) return [];

    let result = [...workHistory];

    if (activeTab !== "all") {
      result = result.filter((item) => item.type === activeTab);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        item.merchantName.toLowerCase().includes(query)
      );
    }

    return result;
  }, [workHistory, activeTab, searchQuery]);

  const proposalCount = workHistory?.filter((i) => i.type === "proposal").length || 0;
  const analysisCount = workHistory?.filter((i) => i.type === "analysis").length || 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md md:max-w-2xl lg:max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <HamburgerMenu />
          <Briefcase className="w-5 h-5 text-primary" />
          <span className="font-semibold">My Work</span>
        </div>
      </header>

      <main className="container max-w-md md:max-w-2xl lg:max-w-6xl mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WorkType)}>
          <TabsList className="w-full grid grid-cols-3 mb-4 h-12">
            <TabsTrigger 
              value="all" 
              className="text-sm min-h-touch" 
              data-testid="tab-all"
            >
              All ({(proposalCount + analysisCount)})
            </TabsTrigger>
            <TabsTrigger 
              value="proposal" 
              className="text-sm min-h-touch" 
              data-testid="tab-proposals"
            >
              Proposals ({proposalCount})
            </TabsTrigger>
            <TabsTrigger 
              value="analysis" 
              className="text-sm min-h-touch" 
              data-testid="tab-analyses"
            >
              Analyses ({analysisCount})
            </TabsTrigger>
          </TabsList>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by merchant name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 min-h-touch"
              data-testid="input-search-work"
            />
          </div>

          <div className="mb-4 text-sm text-muted-foreground">
            {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
          </div>

          {isLoading ? (
            <>
              <div className="hidden md:block">
                <Table data-testid="work-history-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Linked Merchant</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <WorkTableRowSkeleton />
                    <WorkTableRowSkeleton />
                    <WorkTableRowSkeleton />
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-3">
                <MobileCardSkeleton />
                <MobileCardSkeleton />
                <MobileCardSkeleton />
              </div>
            </>
          ) : filteredItems.length > 0 ? (
            <>
              <div className="hidden md:block">
                <Table data-testid="work-history-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Linked Merchant</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <WorkHistoryRow
                        key={`${item.type}-${item.id}`}
                        item={item}
                        merchants={merchants}
                        onAssignMerchant={handleAssignMerchant}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-3">
                {filteredItems.map((item) => (
                  <MobileWorkCard
                    key={`${item.type}-${item.id}`}
                    item={item}
                    merchants={merchants}
                    onAssignMerchant={handleAssignMerchant}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "No results found" : "No work history yet"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery
                  ? "Try a different search term"
                  : "Your proposals and statement analyses will appear here"}
              </p>
              {!searchQuery && (
                <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                  <Link href="/proposal-generator">
                    <Button data-testid="button-create-proposal">
                      Create Proposal
                    </Button>
                  </Link>
                  <Link href="/statement-analyzer">
                    <Button variant="outline" data-testid="button-analyze-statement">
                      Analyze Statement
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
