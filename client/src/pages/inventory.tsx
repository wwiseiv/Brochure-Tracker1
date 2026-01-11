import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Package,
  PackageCheck,
  AlertTriangle,
  ArrowLeft,
  Plus,
  History,
  Users,
  TrendingDown,
  RefreshCw,
  Home,
  User,
  ChevronDown,
  ChevronRight,
  ArrowUpFromLine,
  Send,
  Clock,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import type {
  AgentInventory,
  InventoryLog,
  BrochureWithLocation,
  BrochureLocationHistory,
} from "@shared/schema";

interface UserRole {
  role: string;
  memberId: number;
  organization: {
    id: number;
    name: string;
  };
  managerId: number | null;
}

interface Assignee {
  userId: string;
  name: string;
  role: string;
}

interface TeamBrochureGroup {
  holderType: string;
  holderId: string | null;
  holderName: string;
  count: number;
  brochures: BrochureWithLocation[];
}

function InventorySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-12 w-full" />
      </Card>
    </div>
  );
}

function BrochureListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function InventoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [restockQuantity, setRestockQuantity] = useState("");
  const [restockNotes, setRestockNotes] = useState("");
  const [activeTab, setActiveTab] = useState("my-brochures");

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedBrochureId, setSelectedBrochureId] = useState<string | null>(null);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [brochureToAssign, setBrochureToAssign] = useState<string | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");

  const [registerMode, setRegisterMode] = useState<"single" | "bulk">("single");
  const [newBrochureId, setNewBrochureId] = useState("");
  const [bulkBrochureIds, setBulkBrochureIds] = useState("");

  const [expandedHolders, setExpandedHolders] = useState<Set<string>>(new Set());

  const { data: userRole } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery<AgentInventory>({
    queryKey: ["/api/inventory"],
  });

  const { data: logs, isLoading: logsLoading } = useQuery<InventoryLog[]>({
    queryKey: ["/api/inventory/logs"],
  });

  const { data: myBrochures, isLoading: myBrochuresLoading } = useQuery<BrochureWithLocation[]>({
    queryKey: ["/api/brochures/my-inventory"],
  });

  const { data: houseBrochures, isLoading: houseBrochuresLoading } = useQuery<BrochureWithLocation[]>({
    queryKey: ["/api/brochures/house"],
    enabled: userRole?.role === "master_admin" || userRole?.role === "relationship_manager",
  });

  const { data: allBrochures, isLoading: allBrochuresLoading } = useQuery<BrochureWithLocation[]>({
    queryKey: ["/api/brochures/locations"],
    enabled: userRole?.role === "master_admin" || userRole?.role === "relationship_manager",
  });

  const { data: assignees } = useQuery<Assignee[]>({
    queryKey: ["/api/brochures/assignees"],
    enabled: userRole?.role === "master_admin" || userRole?.role === "relationship_manager",
  });

  const { data: brochureHistory, isLoading: historyLoading } = useQuery<BrochureLocationHistory[]>({
    queryKey: ["/api/brochures", selectedBrochureId, "history"],
    enabled: !!selectedBrochureId && historyDialogOpen,
  });

  const { data: allInventory, isLoading: allInventoryLoading } = useQuery<AgentInventory[]>({
    queryKey: ["/api/inventory/all"],
    enabled: userRole?.role === "master_admin",
  });

  const restockMutation = useMutation({
    mutationFn: async (data: { quantity: number; notes?: string }) => {
      const res = await apiRequest("POST", "/api/inventory/restock", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/all"] });
      setRestockQuantity("");
      setRestockNotes("");
      toast({
        title: "Inventory updated",
        description: "Brochures have been added to your inventory.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update inventory. Please try again.",
        variant: "destructive",
      });
    },
  });

  const thresholdMutation = useMutation({
    mutationFn: async (threshold: number) => {
      const res = await apiRequest("PATCH", "/api/inventory/threshold", { threshold });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Threshold updated",
        description: "Low stock warning threshold has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update threshold. Please try again.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (brochureId: string) => {
      const res = await apiRequest("POST", "/api/brochures/register", { brochureId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brochures/house"] });
      queryClient.invalidateQueries({ queryKey: ["/api/brochures/locations"] });
      setNewBrochureId("");
      toast({
        title: "Brochure registered",
        description: "The brochure has been added to house inventory.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to register brochure.",
        variant: "destructive",
      });
    },
  });

  const registerBulkMutation = useMutation({
    mutationFn: async (brochureIds: string[]) => {
      const res = await apiRequest("POST", "/api/brochures/register-bulk", { brochureIds });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/brochures/house"] });
      queryClient.invalidateQueries({ queryKey: ["/api/brochures/locations"] });
      setBulkBrochureIds("");
      toast({
        title: "Brochures registered",
        description: `${data.registered || "All"} brochures have been added to house inventory.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to register brochures.",
        variant: "destructive",
      });
    },
  });

  const transferMutation = useMutation({
    mutationFn: async ({ brochureId, toHolderType, toHolderId }: {
      brochureId: string;
      toHolderType: string;
      toHolderId: string | null;
    }) => {
      const res = await apiRequest("POST", `/api/brochures/${brochureId}/transfer`, {
        toHolderType,
        toHolderId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brochures/my-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/brochures/house"] });
      queryClient.invalidateQueries({ queryKey: ["/api/brochures/locations"] });
      setAssignDialogOpen(false);
      setBrochureToAssign(null);
      setSelectedAssignee("");
      toast({
        title: "Brochure transferred",
        description: "The brochure has been transferred successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to transfer brochure.",
        variant: "destructive",
      });
    },
  });

  const handleRestock = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(restockQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a positive number.",
        variant: "destructive",
      });
      return;
    }
    restockMutation.mutate({ quantity: qty, notes: restockNotes || undefined });
  };

  const handleThresholdChange = (value: number[]) => {
    thresholdMutation.mutate(value[0]);
  };

  const handleRegisterSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrochureId.trim()) {
      toast({
        title: "Invalid ID",
        description: "Please enter a brochure ID.",
        variant: "destructive",
      });
      return;
    }
    registerMutation.mutate(newBrochureId.trim());
  };

  const handleRegisterBulk = (e: React.FormEvent) => {
    e.preventDefault();
    const ids = bulkBrochureIds
      .split(/[\n,]+/)
      .map(id => id.trim())
      .filter(id => id.length > 0);
    if (ids.length === 0) {
      toast({
        title: "Invalid input",
        description: "Please enter at least one brochure ID.",
        variant: "destructive",
      });
      return;
    }
    registerBulkMutation.mutate(ids);
  };

  const handleAssign = () => {
    if (!brochureToAssign || !selectedAssignee) return;
    
    if (selectedAssignee === "house") {
      transferMutation.mutate({
        brochureId: brochureToAssign,
        toHolderType: "house",
        toHolderId: null,
      });
    } else {
      const assignee = assignees?.find(a => a.userId === selectedAssignee);
      if (assignee) {
        transferMutation.mutate({
          brochureId: brochureToAssign,
          toHolderType: assignee.role === "relationship_manager" ? "relationship_manager" : "agent",
          toHolderId: selectedAssignee,
        });
      }
    }
  };

  const handleReturnToHouse = (brochureId: string) => {
    transferMutation.mutate({
      brochureId,
      toHolderType: "house",
      toHolderId: null,
    });
  };

  const openHistoryDialog = (brochureId: string) => {
    setSelectedBrochureId(brochureId);
    setHistoryDialogOpen(true);
  };

  const openAssignDialog = (brochureId: string) => {
    setBrochureToAssign(brochureId);
    setAssignDialogOpen(true);
  };

  const toggleHolderExpanded = (holderId: string) => {
    setExpandedHolders(prev => {
      const next = new Set(prev);
      if (next.has(holderId)) {
        next.delete(holderId);
      } else {
        next.add(holderId);
      }
      return next;
    });
  };

  const isAdminOrRM = userRole?.role === "master_admin" || userRole?.role === "relationship_manager";
  const brochuresOnHand = inventory?.brochuresOnHand ?? 0;
  const brochuresDeployed = inventory?.brochuresDeployed ?? 0;
  const lowStockThreshold = inventory?.lowStockThreshold ?? 10;
  const isLowStock = brochuresOnHand < lowStockThreshold;

  const getChangeTypeLabel = (changeType: string) => {
    switch (changeType) {
      case "restock":
        return "Restocked";
      case "deploy":
        return "Deployed";
      case "return":
        return "Returned";
      case "adjustment":
        return "Adjusted";
      default:
        return changeType;
    }
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case "restock":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "deploy":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "return":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getHolderTypeIcon = (holderType: string) => {
    switch (holderType) {
      case "house":
        return <Home className="h-4 w-4" />;
      case "relationship_manager":
        return <Users className="h-4 w-4" />;
      case "agent":
        return <User className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getHolderTypeBadge = (holderType: string) => {
    switch (holderType) {
      case "house":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "relationship_manager":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "agent":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getTransferTypeLabel = (transferType: string) => {
    switch (transferType) {
      case "register":
        return "Registered";
      case "assign":
        return "Assigned";
      case "return":
        return "Returned";
      case "deploy":
        return "Deployed";
      case "lost":
        return "Marked Lost";
      default:
        return transferType;
    }
  };

  const teamGroups: TeamBrochureGroup[] = (() => {
    if (!allBrochures || !assignees) return [];
    
    const groups: Record<string, TeamBrochureGroup> = {};
    
    groups["house"] = {
      holderType: "house",
      holderId: null,
      holderName: "House Inventory",
      count: 0,
      brochures: [],
    };
    
    assignees.forEach(a => {
      groups[a.userId] = {
        holderType: a.role === "relationship_manager" ? "relationship_manager" : "agent",
        holderId: a.userId,
        holderName: a.name || a.userId.slice(0, 8),
        count: 0,
        brochures: [],
      };
    });
    
    allBrochures.forEach(b => {
      const loc = b.location;
      if (!loc) return;
      
      if (loc.holderType === "house") {
        groups["house"].count++;
        groups["house"].brochures.push(b);
      } else if (loc.holderId && groups[loc.holderId]) {
        groups[loc.holderId].count++;
        groups[loc.holderId].brochures.push(b);
      }
    });
    
    return Object.values(groups).filter(g => g.count > 0 || g.holderType === "house");
  })();

  const isLoading = inventoryLoading || logsLoading;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <span className="font-semibold">Inventory</span>
        </div>
      </header>

      <main className="container max-w-md mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <InventorySkeleton />
        ) : (
          <>
            <section className="grid grid-cols-2 gap-4">
              <Card className="p-4" data-testid="card-on-hand">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">On Hand</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold" data-testid="text-on-hand-count">
                    {brochuresOnHand}
                  </span>
                  {isLowStock && (
                    <Badge
                      variant="destructive"
                      className="text-xs"
                      data-testid="badge-low-stock"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Low
                    </Badge>
                  )}
                </div>
              </Card>

              <Card className="p-4" data-testid="card-deployed">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <PackageCheck className="h-4 w-4" />
                  <span className="text-sm">Deployed</span>
                </div>
                <span className="text-3xl font-bold" data-testid="text-deployed-count">
                  {brochuresDeployed}
                </span>
              </Card>
            </section>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-3" data-testid="tabs-inventory">
                <TabsTrigger value="my-brochures" data-testid="tab-my-brochures">
                  My Brochures
                </TabsTrigger>
                {isAdminOrRM && (
                  <>
                    <TabsTrigger value="house" data-testid="tab-house">
                      House
                    </TabsTrigger>
                    <TabsTrigger value="team" data-testid="tab-team">
                      Team View
                    </TabsTrigger>
                  </>
                )}
                {!isAdminOrRM && (
                  <>
                    <TabsTrigger value="house" disabled className="opacity-50">
                      House
                    </TabsTrigger>
                    <TabsTrigger value="team" disabled className="opacity-50">
                      Team View
                    </TabsTrigger>
                  </>
                )}
              </TabsList>

              <TabsContent value="my-brochures" className="mt-4">
                <Card className="p-4" data-testid="card-my-brochures">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    My Assigned Brochures
                  </h3>
                  {myBrochuresLoading ? (
                    <BrochureListSkeleton />
                  ) : !myBrochures || myBrochures.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No brochures assigned to you
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {myBrochures.map((brochure) => (
                        <div
                          key={brochure.id}
                          className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg"
                          data-testid={`brochure-item-${brochure.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" data-testid={`text-brochure-id-${brochure.id}`}>
                              {brochure.id}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {brochure.status}
                              </Badge>
                              {brochure.location?.assignedAt && (
                                <span className="text-xs text-muted-foreground">
                                  Since {format(new Date(brochure.location.assignedAt), "MMM d")}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openHistoryDialog(brochure.id)}
                              data-testid={`button-history-${brochure.id}`}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReturnToHouse(brochure.id)}
                              disabled={transferMutation.isPending}
                              data-testid={`button-return-${brochure.id}`}
                            >
                              <ArrowUpFromLine className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="house" className="mt-4 space-y-4">
                {isAdminOrRM && (
                  <>
                    <Card className="p-4" data-testid="card-register-brochure">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Register New Brochures
                      </h3>
                      <div className="flex gap-2 mb-4">
                        <Button
                          variant={registerMode === "single" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setRegisterMode("single")}
                          data-testid="button-register-single-mode"
                        >
                          Single
                        </Button>
                        <Button
                          variant={registerMode === "bulk" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setRegisterMode("bulk")}
                          data-testid="button-register-bulk-mode"
                        >
                          Bulk
                        </Button>
                      </div>

                      {registerMode === "single" ? (
                        <form onSubmit={handleRegisterSingle} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="brochure-id">Brochure ID</Label>
                            <Input
                              id="brochure-id"
                              placeholder="Enter brochure ID"
                              value={newBrochureId}
                              onChange={(e) => setNewBrochureId(e.target.value)}
                              className="min-h-[48px]"
                              data-testid="input-brochure-id"
                            />
                          </div>
                          <Button
                            type="submit"
                            className="w-full min-h-[48px]"
                            disabled={registerMutation.isPending || !newBrochureId.trim()}
                            data-testid="button-register-single"
                          >
                            {registerMutation.isPending ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Registering...
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Register Brochure
                              </>
                            )}
                          </Button>
                        </form>
                      ) : (
                        <form onSubmit={handleRegisterBulk} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="bulk-ids">Brochure IDs (one per line or comma-separated)</Label>
                            <Textarea
                              id="bulk-ids"
                              placeholder="BR001&#10;BR002&#10;BR003"
                              value={bulkBrochureIds}
                              onChange={(e) => setBulkBrochureIds(e.target.value)}
                              className="resize-none min-h-[120px]"
                              data-testid="input-bulk-ids"
                            />
                          </div>
                          <Button
                            type="submit"
                            className="w-full min-h-[48px]"
                            disabled={registerBulkMutation.isPending || !bulkBrochureIds.trim()}
                            data-testid="button-register-bulk"
                          >
                            {registerBulkMutation.isPending ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Registering...
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Register All
                              </>
                            )}
                          </Button>
                        </form>
                      )}
                    </Card>

                    <Card className="p-4" data-testid="card-house-inventory">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Home className="h-5 w-5" />
                        House Inventory
                        {houseBrochures && (
                          <Badge variant="secondary" className="ml-auto">
                            {houseBrochures.length}
                          </Badge>
                        )}
                      </h3>
                      {houseBrochuresLoading ? (
                        <BrochureListSkeleton />
                      ) : !houseBrochures || houseBrochures.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No brochures in house inventory
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {houseBrochures.map((brochure) => (
                            <div
                              key={brochure.id}
                              className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg"
                              data-testid={`house-brochure-${brochure.id}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{brochure.id}</p>
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {brochure.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openHistoryDialog(brochure.id)}
                                  data-testid={`button-house-history-${brochure.id}`}
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openAssignDialog(brochure.id)}
                                  data-testid={`button-assign-${brochure.id}`}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </>
                )}
              </TabsContent>

              <TabsContent value="team" className="mt-4">
                {isAdminOrRM && (
                  <Card className="p-4" data-testid="card-team-view">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Team Brochures
                    </h3>
                    {allBrochuresLoading ? (
                      <BrochureListSkeleton />
                    ) : teamGroups.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No brochures registered yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {teamGroups.map((group) => {
                          const key = group.holderId || "house";
                          const isExpanded = expandedHolders.has(key);
                          return (
                            <Collapsible
                              key={key}
                              open={isExpanded}
                              onOpenChange={() => toggleHolderExpanded(key)}
                            >
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="w-full justify-between p-3 h-auto"
                                  data-testid={`button-expand-${key}`}
                                >
                                  <div className="flex items-center gap-2">
                                    {getHolderTypeIcon(group.holderType)}
                                    <span className="font-medium">{group.holderName}</span>
                                    <Badge
                                      variant="secondary"
                                      className={`text-xs ${getHolderTypeBadge(group.holderType)}`}
                                    >
                                      {group.holderType === "relationship_manager" ? "RM" : group.holderType}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{group.count}</Badge>
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </div>
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="pl-4 space-y-2 mt-2">
                                {group.brochures.map((brochure) => (
                                  <div
                                    key={brochure.id}
                                    className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded"
                                    data-testid={`team-brochure-${brochure.id}`}
                                  >
                                    <span className="text-sm font-medium truncate">{brochure.id}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openHistoryDialog(brochure.id)}
                                      data-testid={`button-team-history-${brochure.id}`}
                                    >
                                      <History className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            <Card className="p-4" data-testid="card-restock">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Restock Brochures
              </h3>
              <form onSubmit={handleRestock} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity to add</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    placeholder="Enter quantity"
                    value={restockQuantity}
                    onChange={(e) => setRestockQuantity(e.target.value)}
                    className="min-h-[48px]"
                    data-testid="input-restock-quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="e.g., Received from warehouse"
                    value={restockNotes}
                    onChange={(e) => setRestockNotes(e.target.value)}
                    className="resize-none"
                    rows={2}
                    data-testid="input-restock-notes"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full min-h-[48px]"
                  disabled={restockMutation.isPending || !restockQuantity}
                  data-testid="button-restock"
                >
                  {restockMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Inventory
                    </>
                  )}
                </Button>
              </form>
            </Card>

            <Card className="p-4" data-testid="card-threshold">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Low Stock Alert
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Warn when below
                  </span>
                  <span className="font-semibold" data-testid="text-threshold-value">
                    {lowStockThreshold} brochures
                  </span>
                </div>
                <Slider
                  value={[lowStockThreshold]}
                  onValueCommit={handleThresholdChange}
                  min={0}
                  max={50}
                  step={5}
                  disabled={thresholdMutation.isPending}
                  className="min-h-[48px]"
                  data-testid="slider-threshold"
                />
                <p className="text-xs text-muted-foreground">
                  You'll see a warning badge when your inventory drops below this threshold.
                </p>
              </div>
            </Card>

            <Card className="p-4" data-testid="card-history">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Activity
              </h3>
              {!logs || logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No inventory activity yet
                </p>
              ) : (
                <div className="space-y-3">
                  {logs.slice(0, 10).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between gap-3 pb-3 border-b border-border last:border-0 last:pb-0"
                      data-testid={`log-item-${log.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${getChangeTypeColor(log.changeType)}`}
                          >
                            {getChangeTypeLabel(log.changeType)}
                          </Badge>
                          <span className="font-medium">
                            {log.quantity > 0 ? "+" : ""}{log.quantity}
                          </span>
                        </div>
                        {log.notes && (
                          <p className="text-sm text-muted-foreground truncate">
                            {log.notes}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {userRole?.role === "master_admin" && (
              <Card className="p-4" data-testid="card-team-inventory">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Inventory Summary
                </h3>
                {allInventoryLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !allInventory || allInventory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No team inventory data
                  </p>
                ) : (
                  <div className="space-y-3">
                    {allInventory.map((inv) => {
                      const memberLowStock = inv.brochuresOnHand < inv.lowStockThreshold;
                      return (
                        <div
                          key={inv.id}
                          className={`flex items-center justify-between gap-3 p-3 rounded-lg ${
                            memberLowStock
                              ? "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800"
                              : "bg-muted/50"
                          }`}
                          data-testid={`team-inventory-${inv.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              Agent: {inv.agentId.slice(0, 8)}...
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {inv.brochuresOnHand} on hand, {inv.brochuresDeployed} deployed
                            </p>
                          </div>
                          {memberLowStock && (
                            <Badge
                              variant="destructive"
                              className="text-xs shrink-0"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Low Stock
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </main>

      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-md mx-auto" data-testid="dialog-brochure-history">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Brochure History
            </DialogTitle>
            <DialogDescription>
              Transfer history for brochure {selectedBrochureId}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {historyLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !brochureHistory || brochureHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No history available
              </p>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
                <div className="space-y-6">
                  {brochureHistory.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="relative"
                      data-testid={`history-entry-${entry.id}`}
                    >
                      <div className="absolute -left-4 w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                        <Clock className="h-2 w-2 text-primary" />
                      </div>
                      <div className="ml-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${getHolderTypeBadge(entry.toHolderType)}`}
                          >
                            {getTransferTypeLabel(entry.transferType)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.createdAt), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm">
                          {entry.fromHolderType ? (
                            <>
                              From{" "}
                              <span className="font-medium">
                                {entry.fromHolderType === "house" ? "House" : entry.fromHolderId?.slice(0, 8) || "Unknown"}
                              </span>
                              {" → "}
                            </>
                          ) : null}
                          <span className="font-medium">
                            {entry.toHolderType === "house" ? "House" : entry.toHolderId?.slice(0, 8) || "Unknown"}
                          </span>
                        </p>
                        {entry.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md mx-auto" data-testid="dialog-assign-brochure">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Assign Brochure
            </DialogTitle>
            <DialogDescription>
              Assign brochure {brochureToAssign} to a team member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assignee">Assign to</Label>
              <Select
                value={selectedAssignee}
                onValueChange={setSelectedAssignee}
              >
                <SelectTrigger className="min-h-[48px]" data-testid="select-assignee">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="house" data-testid="select-option-house">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      House Inventory
                    </div>
                  </SelectItem>
                  {assignees?.map((assignee) => (
                    <SelectItem
                      key={assignee.userId}
                      value={assignee.userId}
                      data-testid={`select-option-${assignee.userId}`}
                    >
                      <div className="flex items-center gap-2">
                        {assignee.role === "relationship_manager" ? (
                          <Users className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                        {assignee.name || assignee.userId.slice(0, 12)}
                        <Badge variant="outline" className="text-xs ml-1">
                          {assignee.role === "relationship_manager" ? "RM" : "Agent"}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
              data-testid="button-cancel-assign"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedAssignee || transferMutation.isPending}
              data-testid="button-confirm-assign"
            >
              {transferMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
