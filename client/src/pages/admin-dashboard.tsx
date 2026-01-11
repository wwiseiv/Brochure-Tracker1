import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
import { useAuth } from "@/hooks/use-auth";
import { BottomNav } from "@/components/BottomNav";
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
} from "lucide-react";
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

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: members, isLoading: membersLoading } = useQuery<OrganizationMember[]>({
    queryKey: ["/api/organization/members"],
  });

  const { data: allDrops, isLoading: dropsLoading } = useQuery<DropWithBrochure[]>({
    queryKey: ["/api/admin/drops"],
  });

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

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
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
                <AvatarImage src={user?.profileImageUrl || undefined} />
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

                <Card
                  className={`p-4 border-l-4 ${
                    (stats?.drops.overduePickups || 0) > 0
                      ? "border-l-destructive"
                      : "border-l-muted"
                  }`}
                  data-testid="card-overdue-pickups"
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
                    <AlertTriangle
                      className={`h-8 w-8 opacity-50 ${
                        (stats?.drops.overduePickups || 0) > 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    />
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
                <Users className="h-5 w-5 text-primary" />
                Team Members
              </h2>
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
                                      {member.userId.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm">
                                      {member.userId.slice(0, 12)}...
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      ID: {member.id}
                                    </p>
                                  </div>
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

      <BottomNav />
    </div>
  );
}
