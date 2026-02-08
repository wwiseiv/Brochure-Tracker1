import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  TrendingUp,
  Package,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowLeft,
  UserCheck,
  Briefcase,
  Shield,
  ChevronRight,
  MapPin,
  X,
  RefreshCw,
  BookOpen,
  Loader2,
  FolderSync,
  CheckCircle,
  Trash2,
  Pencil,
  Award,
  Image,
  Wrench,
  ExternalLink,
} from "lucide-react";
import { isToday, isPast, parseISO, startOfDay } from "date-fns";
import { format, formatDistanceToNow } from "date-fns";
import type { OrganizationMember, DropWithBrochure, DropStatus } from "@shared/schema";

interface AdminStats {
  organization: {
    id: number;
    name: string;
  };
  team: {
    totalMembers: number;
    admins: number;
    rms: number;
    agents: number;
  };
  drops: {
    total: number;
    pending: number;
    pickedUp: number;
    converted: number;
    todaysPickups: number;
    overduePickups: number;
  };
  performance: {
    conversionRate: number;
    pickupRate: number;
  };
}

interface MemberWithStats extends OrganizationMember {
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    profileImageUrl?: string;
  };
  dropsCount?: number;
  conversionRate?: number;
  agentsManaged?: number;
}

function getRoleBadgeVariant(role: string): "default" | "secondary" | "destructive" | "outline" {
  return "default";
}

function getRoleBadgeClassName(role: string): string {
  switch (role) {
    case "master_admin":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300";
    case "relationship_manager":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300";
    case "agent":
      return "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300";
    default:
      return "";
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "master_admin":
      return "Admin";
    case "relationship_manager":
      return "RM";
    case "agent":
      return "Agent";
    default:
      return role;
  }
}

function getRoleIcon(role: string) {
  switch (role) {
    case "master_admin":
      return Shield;
    case "relationship_manager":
      return Briefcase;
    case "agent":
      return UserCheck;
    default:
      return Users;
  }
}

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}

type DropsFilter = "todays" | "overdue" | "pending" | null;

interface DriveStatus {
  connected: boolean;
  localDocCount: number;
  lastSynced: string | null;
}

interface UserRole {
  role: string;
  memberId: number;
  organization: {
    id: number;
    name: string;
  };
  managerId: number | null;
  profilePhotoUrl: string | null;
}

interface CertificateManifest {
  totalAssets: number;
  categories: Record<string, number>;
  generatedAt?: string;
}

function CertificateBadgeAssetsSection() {
  const { toast } = useToast();

  const { data: manifest, isLoading: manifestLoading } = useQuery<CertificateManifest>({
    queryKey: ["/api/certificates/manifest"],
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/generate-certificate-assets");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to regenerate assets");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Assets Regenerated",
        description: "Certificate and badge assets have been regenerated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/certificates/manifest"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Regeneration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const totalAssets = manifest?.totalAssets || 0;
  const categories = manifest?.categories || {};

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" data-testid="text-certificate-assets-title">
        <Award className="h-5 w-5 text-primary" />
        Certificate & Badge Assets
      </h2>
      <Card className="p-6" data-testid="card-certificate-assets">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground" data-testid="text-asset-count">
                {manifestLoading ? "Loading..." : `${totalAssets} assets available`}
              </span>
            </div>
            {manifest?.generatedAt && (
              <span className="text-xs text-muted-foreground" data-testid="text-asset-generated-at">
                Last generated: {formatDistanceToNow(new Date(manifest.generatedAt), { addSuffix: true })}
              </span>
            )}
          </div>
          <Button
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            data-testid="button-regenerate-assets"
          >
            {regenerateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate Assets
              </>
            )}
          </Button>
        </div>

        {Object.keys(categories).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" data-testid="grid-asset-categories">
            {Object.entries(categories).map(([category, count]) => (
              <div
                key={category}
                className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                data-testid={`card-asset-category-${category}`}
              >
                <span className="text-sm font-medium capitalize">{category}</span>
                <Badge variant="secondary" data-testid={`badge-asset-count-${category}`}>
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {!manifestLoading && totalAssets === 0 && (
          <div className="text-center py-4 text-muted-foreground" data-testid="text-no-assets">
            No certificate assets found. Click "Regenerate Assets" to create them.
          </div>
        )}
      </Card>
    </section>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedFilter, setSelectedFilter] = useState<DropsFilter>(null);
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");

  const { data: userRole } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: members, isLoading: membersLoading } = useQuery<OrganizationMember[]>({
    queryKey: ["/api/organization/members"],
  });

  const { data: allDrops, isLoading: dropsLoading } = useQuery<DropWithBrochure[]>({
    queryKey: ["/api/admin/drops"],
  });

  const { data: driveStatus, isLoading: driveLoading, refetch: refetchDrive } = useQuery<DriveStatus>({
    queryKey: ["/api/drive/status"],
  });

  // Track sync status with polling
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { data: syncStatusData, refetch: refetchSyncStatus } = useQuery<{
    inProgress: boolean;
    synced: number;
    total: number;
    message: string;
    errors: string[];
  }>({
    queryKey: ["/api/drive/sync-status"],
    enabled: isSyncing,
    refetchInterval: isSyncing ? 2000 : false, // Poll every 2 seconds while syncing
  });
  
  // Check if sync completed
  useEffect(() => {
    if (isSyncing && syncStatusData && !syncStatusData.inProgress && syncStatusData.message.startsWith("Completed")) {
      setIsSyncing(false);
      toast({
        title: "Sync Complete",
        description: syncStatusData.message,
      });
      refetchDrive();
    }
  }, [syncStatusData, isSyncing, refetchDrive, toast]);

  // Delete drop state and mutation
  const [dropToDelete, setDropToDelete] = useState<{ id: number; name: string } | null>(null);
  
  const deleteDropMutation = useMutation({
    mutationFn: async (dropId: number) => {
      const res = await apiRequest("DELETE", `/api/drops/${dropId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete drop");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Drop deleted",
        description: "The drop record has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/drops"] });
      setDropToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/drive/sync");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.inProgress) {
        setIsSyncing(true);
        toast({
          title: "Sync Started",
          description: "Syncing in background. This may take a few minutes for large folders.",
        });
      } else {
        toast({
          title: "Sync Complete",
          description: `Synced ${data.synced} training documents from Google Drive`,
        });
        refetchDrive();
      }
    },
    onError: (error: Error) => {
      setIsSyncing(false);
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, firstName, lastName }: { memberId: number; firstName: string; lastName: string }) => {
      const res = await apiRequest("PATCH", `/api/organization/members/${memberId}`, {
        firstName: firstName || null,
        lastName: lastName || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Member Updated",
        description: "Team member name has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organization/members"] });
      setEditingMember(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openEditDialog = (member: OrganizationMember) => {
    setEditingMember(member);
    setEditFirstName(member.firstName || "");
    setEditLastName(member.lastName || "");
  };

  const handleSaveMember = () => {
    if (editingMember) {
      updateMemberMutation.mutate({
        memberId: editingMember.id,
        firstName: editFirstName,
        lastName: editLastName,
      });
    }
  };

  const getMemberDisplayName = (member: OrganizationMember) => {
    if (member.firstName || member.lastName) {
      return `${member.firstName || ""} ${member.lastName || ""}`.trim();
    }
    return `User ${member.userId.slice(0, 8)}...`;
  };

  const getMemberInitials = (member: OrganizationMember) => {
    if (member.firstName && member.lastName) {
      return `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
    }
    if (member.firstName) {
      return member.firstName.slice(0, 2).toUpperCase();
    }
    return member.userId.slice(0, 2).toUpperCase();
  };

  const getFilteredDrops = (): DropWithBrochure[] => {
    if (!allDrops) return [];
    
    switch (selectedFilter) {
      case "todays":
        return allDrops.filter((d) => {
          if (!d.pickupScheduledFor || d.status !== "pending") return false;
          const pickupDate = typeof d.pickupScheduledFor === "string" 
            ? parseISO(d.pickupScheduledFor) 
            : new Date(d.pickupScheduledFor);
          return isToday(pickupDate);
        });
      case "overdue":
        return allDrops.filter((d) => {
          if (!d.pickupScheduledFor || d.status !== "pending") return false;
          const pickupDate = typeof d.pickupScheduledFor === "string" 
            ? parseISO(d.pickupScheduledFor) 
            : new Date(d.pickupScheduledFor);
          return isPast(pickupDate) && !isToday(pickupDate);
        });
      case "pending":
        return allDrops.filter((d) => d.status === "pending");
      default:
        return [];
    }
  };

  const filteredDrops = getFilteredDrops();
  const filterTitle = selectedFilter === "todays" ? "Today's Pickups" 
    : selectedFilter === "overdue" ? "Overdue Pickups" 
    : selectedFilter === "pending" ? "All Pending Drops" 
    : "";

  const userInitials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U"
    : "U";

  const isLoading = statsLoading || membersLoading || dropsLoading;

  const membersWithStats: MemberWithStats[] = (members || []).map((member) => {
    const memberDrops = (allDrops || []).filter((d) => d.agentId === member.userId);
    const convertedDrops = memberDrops.filter((d) => d.status === "converted");
    const agentsManaged = (members || []).filter((m) => m.managerId === member.id).length;

    return {
      ...member,
      dropsCount: memberDrops.length,
      conversionRate:
        memberDrops.length > 0
          ? Math.round((convertedDrops.length / memberDrops.length) * 100)
          : 0,
      agentsManaged,
    };
  });

  const recentDrops = (allDrops || []).slice(0, 10);

  const handleBack = () => {
    if (window.history.length > 2) {
      window.history.back();
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back-home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg hidden sm:inline">Admin Dashboard</span>
              <span className="font-semibold sm:hidden">Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden md:inline">
              {stats?.organization.name || "Organization"}
            </span>
            <Link href="/profile">
              <Avatar className="w-8 h-8 cursor-pointer" data-testid="avatar-admin">
                <AvatarImage src={userRole?.profilePhotoUrl || user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <AdminDashboardSkeleton />
        ) : (
          <>
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Performance Overview
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4" data-testid="card-total-drops">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Package className="h-4 w-4" />
                    <span className="text-sm">Total Drops</span>
                  </div>
                  <p className="text-2xl font-bold">{stats?.drops.total || 0}</p>
                </Card>

                <Card className="p-4" data-testid="card-conversions">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">Conversions</span>
                  </div>
                  <p className="text-2xl font-bold">{stats?.drops.converted || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats?.performance.conversionRate || 0}% rate
                  </p>
                </Card>

                <Card className="p-4" data-testid="card-pickup-rate">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Pickup Rate</span>
                  </div>
                  <p className="text-2xl font-bold">{stats?.performance.pickupRate || 0}%</p>
                  <p className="text-xs text-muted-foreground">
                    {stats?.drops.pickedUp || 0} picked up
                  </p>
                </Card>

                <Card className="p-4" data-testid="card-team-size">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Team Size</span>
                  </div>
                  <p className="text-2xl font-bold">{stats?.team.totalMembers || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats?.team.rms || 0} RMs, {stats?.team.agents || 0} Agents
                  </p>
                </Card>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                AI Training Materials
              </h2>
              <Card className="p-4" data-testid="card-training-sync">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FolderSync className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Google Drive Training Materials</h3>
                      <p className="text-sm text-muted-foreground">
                        Sync sales scripts, objection handling guides, and training docs to enhance AI coaching.
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        {driveLoading ? (
                          <Skeleton className="h-4 w-32" />
                        ) : (
                          <>
                            <span className="flex items-center gap-1">
                              {driveStatus?.connected ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <AlertTriangle className="h-3 w-3 text-amber-600" />
                              )}
                              {driveStatus?.connected ? "Connected" : "Not connected"}
                            </span>
                            <span className="text-muted-foreground">
                              {driveStatus?.localDocCount || 0} documents synced
                            </span>
                            {driveStatus?.lastSynced && (
                              <span className="text-muted-foreground">
                                Last: {formatDistanceToNow(new Date(driveStatus.lastSynced), { addSuffix: true })}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending || isSyncing || !driveStatus?.connected}
                    data-testid="button-sync-training"
                  >
                    {syncMutation.isPending || isSyncing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isSyncing && syncStatusData 
                          ? `Syncing... ${syncStatusData.message}` 
                          : "Starting sync..."}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Now
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Drops Overview
              </h2>
              <p className="text-sm text-muted-foreground mb-3">Tap a card to view the drops</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card 
                  className={`p-4 border-l-4 border-l-blue-500 cursor-pointer hover-elevate ${selectedFilter === "todays" ? "ring-2 ring-blue-500" : ""}`} 
                  data-testid="card-todays-pickups"
                  onClick={() => setSelectedFilter(selectedFilter === "todays" ? null : "todays")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Today's Pickups</p>
                      <p className="text-2xl font-bold">{stats?.drops.todaysPickups || 0}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-8 w-8 text-blue-500 opacity-50" />
                      <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${selectedFilter === "todays" ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                </Card>

                <Card
                  className={`p-4 border-l-4 cursor-pointer hover-elevate ${
                    (stats?.drops.overduePickups || 0) > 0
                      ? "border-l-destructive"
                      : "border-l-muted"
                  } ${selectedFilter === "overdue" ? "ring-2 ring-destructive" : ""}`}
                  data-testid="card-overdue-pickups"
                  onClick={() => setSelectedFilter(selectedFilter === "overdue" ? null : "overdue")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Overdue</p>
                      <p
                        className={`text-2xl font-bold ${
                          (stats?.drops.overduePickups || 0) > 0 ? "text-destructive" : ""
                        }`}
                      >
                        {stats?.drops.overduePickups || 0}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`h-8 w-8 opacity-50 ${
                          (stats?.drops.overduePickups || 0) > 0
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      />
                      <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${selectedFilter === "overdue" ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                </Card>

                <Card 
                  className={`p-4 border-l-4 border-l-amber-500 cursor-pointer hover-elevate ${selectedFilter === "pending" ? "ring-2 ring-amber-500" : ""}`} 
                  data-testid="card-pending-total"
                  onClick={() => setSelectedFilter(selectedFilter === "pending" ? null : "pending")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Pending</p>
                      <p className="text-2xl font-bold">{stats?.drops.pending || 0}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-8 w-8 text-amber-500 opacity-50" />
                      <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${selectedFilter === "pending" ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                </Card>
              </div>

              {selectedFilter && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{filterTitle} ({filteredDrops.length})</h3>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedFilter(null)} data-testid="button-close-drops">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {filteredDrops.length === 0 ? (
                    <Card className="p-6 text-center text-muted-foreground">
                      No drops found in this category
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {filteredDrops.map((drop) => {
                        const member = members?.find((m) => m.userId === drop.agentId);
                        return (
                          <Card 
                            key={drop.id} 
                            className="p-4 cursor-pointer hover-elevate"
                            onClick={() => navigate(`/drops/${drop.id}`)}
                            data-testid={`card-drop-${drop.id}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{drop.businessName || "Unknown Business"}</p>
                                {drop.address && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{drop.address}</span>
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <StatusBadge status={drop.status as DropStatus} />
                                  {drop.pickupScheduledFor && (
                                    <span className="text-xs text-muted-foreground">
                                      Due: {format(typeof drop.pickupScheduledFor === "string" ? parseISO(drop.pickupScheduledFor) : drop.pickupScheduledFor, "MMM d")}
                                    </span>
                                  )}
                                  {member && (
                                    <span className="text-xs text-muted-foreground">
                                      Agent: {member.userId.slice(0, 8)}...
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDropToDelete({ id: drop.id, name: drop.businessName || "Unnamed Business" });
                                  }}
                                  data-testid={`button-delete-drop-${drop.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Team Members
                </h2>
                <Link href="/admin/team">
                  <Button variant="outline" size="sm" data-testid="button-manage-team">
                    Manage Team
                  </Button>
                </Link>
              </div>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="hidden md:table-cell">Manager / Team</TableHead>
                        <TableHead className="text-right">Drops</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Conv. Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {membersWithStats.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No team members found
                          </TableCell>
                        </TableRow>
                      ) : (
                        membersWithStats.map((member) => {
                          const managerMember = member.managerId
                            ? members?.find((m) => m.id === member.managerId)
                            : null;
                          const RoleIcon = getRoleIcon(member.role);

                          return (
                            <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs">
                                      {getMemberInitials(member)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate" data-testid={`text-member-name-${member.id}`}>
                                      {getMemberDisplayName(member)}
                                    </p>
                                    <p className="text-xs text-muted-foreground" data-testid={`text-member-id-${member.id}`}>
                                      ID: {member.id}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditDialog(member)}
                                    data-testid={`button-edit-member-${member.id}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="default"
                                  className={getRoleBadgeClassName(member.role)}
                                  data-testid={`badge-role-${member.id}`}
                                >
                                  <RoleIcon className="h-3 w-3 mr-1" />
                                  {getRoleLabel(member.role)}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {member.role === "agent" && managerMember ? (
                                  <span className="text-sm text-muted-foreground">
                                    Reports to ID: {managerMember.id}
                                  </span>
                                ) : member.role === "relationship_manager" ? (
                                  <span className="text-sm">
                                    {member.agentsManaged || 0} agents
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {member.dropsCount || 0}
                              </TableCell>
                              <TableCell className="text-right hidden sm:table-cell">
                                <span
                                  className={
                                    (member.conversionRate || 0) >= 20
                                      ? "text-green-600 dark:text-green-400"
                                      : ""
                                  }
                                >
                                  {member.conversionRate || 0}%
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Activity
              </h2>
              <Card className="divide-y divide-border">
                {recentDrops.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No recent drops found
                  </div>
                ) : (
                  recentDrops.map((drop) => (
                    <div
                      key={drop.id}
                      className="p-4 flex items-center justify-between gap-4"
                      data-testid={`activity-drop-${drop.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">
                            {drop.businessName || "Unnamed Business"}
                          </p>
                          <StatusBadge status={drop.status as DropStatus} />
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {drop.address || "No address"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Dropped{" "}
                          {formatDistanceToNow(new Date(drop.droppedAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link href={`/drops/${drop.id}`}>
                          <Button variant="ghost" size="sm" data-testid={`button-view-drop-${drop.id}`}>
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDropToDelete({ id: drop.id, name: drop.businessName || "Unnamed Business" })}
                          data-testid={`button-delete-drop-${drop.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </Card>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" data-testid="text-pcb-auto-title">
                <Wrench className="h-5 w-5 text-primary" />
                PCB Auto Shop Management
              </h2>
              <Card className="p-6" data-testid="card-pcb-auto-shortcut">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Wrench className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Auto Repair Shop Platform</h3>
                      <p className="text-sm text-muted-foreground">
                        Manage repair orders, inspections, scheduling, customers, payments, and staff for auto repair shops.
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild
                    data-testid="button-open-pcb-auto"
                  >
                    <a href="https://4bfdeb81-6da7-43df-808d-276793a396f0.replit.app/auto/login" target="_blank" rel="noopener noreferrer">
                      Open PCB Auto
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                </div>
              </Card>
            </section>

            <CertificateBadgeAssetsSection />
          </>
        )}
      </main>

      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                placeholder="Enter first name"
                data-testid="input-member-first-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                placeholder="Enter last name"
                data-testid="input-member-last-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingMember(null)}
              data-testid="button-cancel-edit-member"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveMember}
              disabled={updateMemberMutation.isPending}
              data-testid="button-save-member"
            >
              {updateMemberMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Drop Confirmation Dialog */}
      <Dialog open={!!dropToDelete} onOpenChange={(open) => !open && setDropToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Drop Record</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete the drop for <strong>{dropToDelete?.name}</strong>? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDropToDelete(null)}
              data-testid="button-cancel-delete-drop"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => dropToDelete && deleteDropMutation.mutate(dropToDelete.id)}
              disabled={deleteDropMutation.isPending}
              data-testid="button-confirm-delete-drop"
            >
              {deleteDropMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
