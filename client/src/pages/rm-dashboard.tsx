import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  Users,
  TrendingUp,
  Package,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowLeft,
  UserCheck,
  Eye,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { OrganizationMember, DropWithBrochure, DropStatus } from "@shared/schema";

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

interface RMStats {
  organization: {
    id: number;
    name: string;
  };
  team: {
    totalAgents: number;
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

interface AgentWithStats extends OrganizationMember {
  dropsCount?: number;
  pendingCount?: number;
  conversionRate?: number;
}

function RMDashboardSkeleton() {
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

export default function RMDashboardPage() {
  const { user } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<AgentWithStats | null>(null);
  const [, navigate] = useLocation();

  const { data: userRole } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<RMStats>({
    queryKey: ["/api/rm/stats"],
  });

  const { data: agents, isLoading: agentsLoading } = useQuery<OrganizationMember[]>({
    queryKey: ["/api/rm/agents"],
  });

  const { data: allDrops, isLoading: dropsLoading } = useQuery<DropWithBrochure[]>({
    queryKey: ["/api/rm/drops"],
  });

  const { data: agentDrops, isLoading: agentDropsLoading } = useQuery<DropWithBrochure[]>({
    queryKey: ["/api/rm/agents", selectedAgent?.userId, "drops"],
    enabled: !!selectedAgent,
  });

  const userInitials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U"
    : "U";

  const isLoading = statsLoading || agentsLoading || dropsLoading;

  const agentsWithStats: AgentWithStats[] = (agents || []).map((agent) => {
    const agentDropsList = (allDrops || []).filter((d) => d.agentId === agent.userId);
    const convertedDrops = agentDropsList.filter((d) => d.status === "converted");
    const pendingDrops = agentDropsList.filter((d) => d.status === "pending");

    return {
      ...agent,
      dropsCount: agentDropsList.length,
      pendingCount: pendingDrops.length,
      conversionRate:
        agentDropsList.length > 0
          ? Math.round((convertedDrops.length / agentDropsList.length) * 100)
          : 0,
    };
  });

  const handleViewAgentDrops = (agent: AgentWithStats) => {
    setSelectedAgent(agent);
  };

  const closeAgentDialog = () => {
    setSelectedAgent(null);
  };

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
              <Briefcase className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg hidden sm:inline">Manager Dashboard</span>
              <span className="font-semibold sm:hidden">Manager</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden md:inline">
              {stats?.organization.name || "Organization"}
            </span>
            <Link href="/profile">
              <Avatar className="w-8 h-8 cursor-pointer" data-testid="avatar-rm">
                <AvatarImage src={userRole?.profilePhotoUrl || user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <RMDashboardSkeleton />
        ) : (
          <>
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Team Performance
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4" data-testid="card-total-agents">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Agents Managed</span>
                  </div>
                  <p className="text-2xl font-bold">{stats?.team.totalAgents || 0}</p>
                </Card>

                <Card className="p-4" data-testid="card-total-drops">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Package className="h-4 w-4" />
                    <span className="text-sm">Total Drops</span>
                  </div>
                  <p className="text-2xl font-bold">{stats?.drops.total || 0}</p>
                </Card>

                <Card className="p-4" data-testid="card-conversion-rate">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">Conversion Rate</span>
                  </div>
                  <p className="text-2xl font-bold">{stats?.performance.conversionRate || 0}%</p>
                  <p className="text-xs text-muted-foreground">
                    {stats?.drops.converted || 0} converted
                  </p>
                </Card>

                <Card
                  className={`p-4 ${
                    (stats?.drops.overduePickups || 0) > 0
                      ? "border-l-4 border-l-destructive"
                      : ""
                  }`}
                  data-testid="card-overdue-pickups"
                >
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Overdue Pickups</span>
                  </div>
                  <p
                    className={`text-2xl font-bold ${
                      (stats?.drops.overduePickups || 0) > 0 ? "text-destructive" : ""
                    }`}
                  >
                    {stats?.drops.overduePickups || 0}
                  </p>
                </Card>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Drops Overview
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4 border-l-4 border-l-blue-500" data-testid="card-todays-pickups">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Today's Pickups</p>
                      <p className="text-2xl font-bold">{stats?.drops.todaysPickups || 0}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-500 opacity-50" />
                  </div>
                </Card>

                <Card className="p-4 border-l-4 border-l-green-500" data-testid="card-picked-up">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Picked Up</p>
                      <p className="text-2xl font-bold">{stats?.drops.pickedUp || 0}</p>
                    </div>
                    <Clock className="h-8 w-8 text-green-500 opacity-50" />
                  </div>
                </Card>

                <Card className="p-4 border-l-4 border-l-amber-500" data-testid="card-pending-total">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Pending</p>
                      <p className="text-2xl font-bold">{stats?.drops.pending || 0}</p>
                    </div>
                    <Package className="h-8 w-8 text-amber-500 opacity-50" />
                  </div>
                </Card>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                My Agents
              </h2>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead className="text-right">Total Drops</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Pending</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Conv. Rate</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agentsWithStats.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No agents assigned to you
                          </TableCell>
                        </TableRow>
                      ) : (
                        agentsWithStats.map((agent) => (
                          <TableRow key={agent.id} data-testid={`row-agent-${agent.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {agent.userId.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {agent.userId.slice(0, 12)}...
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    ID: {agent.id}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {agent.dropsCount || 0}
                            </TableCell>
                            <TableCell className="text-right hidden sm:table-cell">
                              <Badge
                                variant="default"
                                className={
                                  (agent.pendingCount || 0) > 0
                                    ? "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300"
                                    : "bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
                                }
                              >
                                {agent.pendingCount || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right hidden sm:table-cell">
                              <span
                                className={
                                  (agent.conversionRate || 0) >= 20
                                    ? "text-green-600 dark:text-green-400"
                                    : ""
                                }
                              >
                                {agent.conversionRate || 0}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewAgentDrops(agent)}
                                data-testid={`button-view-agent-${agent.id}`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Drops
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Team Activity
              </h2>
              <Card className="divide-y divide-border">
                {(allDrops || []).length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No recent drops found
                  </div>
                ) : (
                  (allDrops || []).slice(0, 10).map((drop) => (
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
                      <Link href={`/drops/${drop.id}`}>
                        <Button variant="ghost" size="sm" data-testid={`button-view-drop-${drop.id}`}>
                          View
                        </Button>
                      </Link>
                    </div>
                  ))
                )}
              </Card>
            </section>
          </>
        )}
      </main>

      <Dialog open={!!selectedAgent} onOpenChange={() => closeAgentDialog()}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Agent Drops: {selectedAgent?.userId.slice(0, 12)}...
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {agentDropsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (agentDrops || []).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No drops found for this agent
              </div>
            ) : (
              <div className="divide-y divide-border rounded-lg border">
                {(agentDrops || []).map((drop) => (
                  <div
                    key={drop.id}
                    className="p-4 flex items-center justify-between gap-4"
                    data-testid={`agent-drop-${drop.id}`}
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
                    <Link href={`/drops/${drop.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => closeAgentDialog()}
                        data-testid={`button-view-agent-drop-${drop.id}`}
                      >
                        View Details
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
