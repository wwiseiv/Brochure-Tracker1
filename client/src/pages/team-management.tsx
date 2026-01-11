import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Shield,
  Briefcase,
  UserCheck,
  Mail,
  RefreshCw,
  X,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import type { OrganizationMember, OrgMemberRole } from "@shared/schema";

interface UserRole {
  role: string;
  memberId: number;
  organization: {
    id: number;
    name: string;
  };
  managerId: number | null;
}

interface Invitation {
  id: number;
  email: string;
  role: OrgMemberRole;
  status: string;
  expiresAt: string;
  createdAt: string;
  managerId: number | null;
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

function getStatusBadgeClassName(status: string): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "accepted":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "expired":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    default:
      return "";
  }
}

function TeamManagementSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Card className="p-4">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function TeamManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [isInvitationActionsOpen, setIsInvitationActionsOpen] = useState(false);

  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<OrgMemberRole>("agent");
  const [newManagerId, setNewManagerId] = useState<string>("");

  const [editRole, setEditRole] = useState<OrgMemberRole>("agent");
  const [editManagerId, setEditManagerId] = useState<string>("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgMemberRole>("agent");
  const [inviteManagerId, setInviteManagerId] = useState<string>("");

  const { data: userRole, isLoading: userRoleLoading } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  const { data: members, isLoading: membersLoading } = useQuery<OrganizationMember[]>({
    queryKey: ["/api/organization/members"],
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery<Invitation[]>({
    queryKey: ["/api/invitations"],
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: { userId: string; role: OrgMemberRole; managerId: number | null }) => {
      const res = await apiRequest("POST", "/api/organization/members", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Member added",
        description: "The new team member has been added successfully.",
      });
      setIsAddDialogOpen(false);
      resetAddForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { role?: OrgMemberRole; managerId?: number | null } }) => {
      const res = await apiRequest("PATCH", `/api/organization/members/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Member updated",
        description: "The team member has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedMember(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/organization/members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Member removed",
        description: "The team member has been removed from the organization.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedMember(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createInvitationMutation = useMutation({
    mutationFn: async (data: { email: string; role: OrgMemberRole; managerId: number | null }) => {
      const res = await apiRequest("POST", "/api/invitations", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      toast({
        title: "Invitation sent",
        description: "An invitation email has been sent to the recipient.",
      });
      setIsInviteDialogOpen(false);
      resetInviteForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/invitations/${id}/resend`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      toast({
        title: "Invitation resent",
        description: "The invitation email has been resent.",
      });
      setIsInvitationActionsOpen(false);
      setSelectedInvitation(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resend invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/invitations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled.",
      });
      setIsInvitationActionsOpen(false);
      setSelectedInvitation(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetAddForm = () => {
    setNewUserId("");
    setNewRole("agent");
    setNewManagerId("");
  };

  const resetInviteForm = () => {
    setInviteEmail("");
    setInviteRole("agent");
    setInviteManagerId("");
  };

  const handleAddMember = () => {
    if (!newUserId.trim()) {
      toast({
        title: "Validation error",
        description: "User ID is required",
        variant: "destructive",
      });
      return;
    }

    const managerId = newRole === "agent" && newManagerId ? parseInt(newManagerId) : null;
    
    if (newRole === "agent" && newManagerId) {
      const manager = members?.find(m => m.id === parseInt(newManagerId));
      if (!manager || manager.role !== "relationship_manager") {
        toast({
          title: "Validation error",
          description: "Selected manager is not a valid Relationship Manager",
          variant: "destructive",
        });
        return;
      }
    }

    addMemberMutation.mutate({
      userId: newUserId.trim(),
      role: newRole,
      managerId,
    });
  };

  const handleEditMember = () => {
    if (!selectedMember) return;

    const managerId = editRole === "agent" && editManagerId ? parseInt(editManagerId) : null;
    
    if (editRole === "agent" && editManagerId) {
      const manager = members?.find(m => m.id === parseInt(editManagerId));
      if (!manager || manager.role !== "relationship_manager") {
        toast({
          title: "Validation error",
          description: "Selected manager is not a valid Relationship Manager",
          variant: "destructive",
        });
        return;
      }
    }

    updateMemberMutation.mutate({
      id: selectedMember.id,
      data: {
        role: editRole,
        managerId,
      },
    });
  };

  const handleDeleteMember = () => {
    if (!selectedMember) return;
    deleteMemberMutation.mutate(selectedMember.id);
  };

  const handleSendInvitation = () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Validation error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      toast({
        title: "Validation error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    const managerId = inviteRole === "agent" && inviteManagerId ? parseInt(inviteManagerId) : null;
    
    if (inviteRole === "agent" && inviteManagerId) {
      const manager = members?.find(m => m.id === parseInt(inviteManagerId));
      if (!manager || manager.role !== "relationship_manager") {
        toast({
          title: "Validation error",
          description: "Selected manager is not a valid Relationship Manager",
          variant: "destructive",
        });
        return;
      }
    }

    createInvitationMutation.mutate({
      email: inviteEmail.trim(),
      role: inviteRole,
      managerId,
    });
  };

  const openEditDialog = (member: OrganizationMember) => {
    setSelectedMember(member);
    setEditRole(member.role as OrgMemberRole);
    setEditManagerId(member.managerId?.toString() || "");
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (member: OrganizationMember) => {
    setSelectedMember(member);
    setIsDeleteDialogOpen(true);
  };

  const relationshipManagers = members?.filter(m => m.role === "relationship_manager") || [];
  const isLoading = userRoleLoading || membersLoading;
  const pendingInvitations = invitations?.filter(inv => inv.status === "pending") || [];

  const canDeleteMember = (member: OrganizationMember): boolean => {
    if (member.id === userRole?.memberId) return false;
    if (member.role === "master_admin") {
      const adminCount = members?.filter(m => m.role === "master_admin").length || 0;
      if (adminCount <= 1) return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="icon" data-testid="button-back-admin">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">Team Management</span>
            </div>
          </div>
          <span className="text-sm text-muted-foreground hidden md:inline">
            {userRole?.organization.name || "Organization"}
          </span>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <TeamManagementSkeleton />
        ) : (
          <>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-semibold">Team Members</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your organization's team members and their roles.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="button-invite-email">
                      <Mail className="h-4 w-4 mr-2" />
                      Invite by Email
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Invite by Email</DialogTitle>
                      <DialogDescription>
                        Send an email invitation to join your organization. They will receive a link to sign up.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="invite-email">Email Address</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="Enter email address"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          data-testid="input-invite-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invite-role">Role</Label>
                        <Select
                          value={inviteRole}
                          onValueChange={(value: OrgMemberRole) => {
                            setInviteRole(value);
                            if (value !== "agent") {
                              setInviteManagerId("");
                            }
                          }}
                        >
                          <SelectTrigger id="invite-role" data-testid="select-invite-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="master_admin" data-testid="option-invite-master-admin">
                              Admin
                            </SelectItem>
                            <SelectItem value="relationship_manager" data-testid="option-invite-relationship-manager">
                              Relationship Manager
                            </SelectItem>
                            <SelectItem value="agent" data-testid="option-invite-agent">
                              Agent
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {inviteRole === "agent" && (
                        <div className="space-y-2">
                          <Label htmlFor="invite-manager">Manager (optional)</Label>
                          <Select value={inviteManagerId} onValueChange={setInviteManagerId}>
                            <SelectTrigger id="invite-manager" data-testid="select-invite-manager">
                              <SelectValue placeholder="Select a manager" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No manager</SelectItem>
                              {relationshipManagers.map((rm) => (
                                <SelectItem
                                  key={rm.id}
                                  value={rm.id.toString()}
                                  data-testid={`option-invite-manager-${rm.id}`}
                                >
                                  {rm.userId.slice(0, 12)}... (ID: {rm.id})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsInviteDialogOpen(false);
                          resetInviteForm();
                        }}
                        data-testid="button-cancel-invite"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSendInvitation}
                        disabled={createInvitationMutation.isPending}
                        data-testid="button-send-invitation"
                      >
                        {createInvitationMutation.isPending ? "Sending..." : "Send Invitation"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-member">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add Team Member</DialogTitle>
                      <DialogDescription>
                        Add a new member to your organization. They will be able to log in with their Replit account.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="user-id">User ID</Label>
                        <Input
                          id="user-id"
                          placeholder="Enter Replit user ID"
                          value={newUserId}
                          onChange={(e) => setNewUserId(e.target.value)}
                          data-testid="input-user-id"
                        />
                        <p className="text-xs text-muted-foreground">
                          The Replit user ID they will use to log in.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={newRole}
                          onValueChange={(value: OrgMemberRole) => {
                            setNewRole(value);
                            if (value !== "agent") {
                              setNewManagerId("");
                            }
                          }}
                        >
                          <SelectTrigger id="role" data-testid="select-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="master_admin" data-testid="option-master-admin">
                              Master Admin
                            </SelectItem>
                            <SelectItem value="relationship_manager" data-testid="option-relationship-manager">
                              Relationship Manager
                            </SelectItem>
                            <SelectItem value="agent" data-testid="option-agent">
                              Agent
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {newRole === "agent" && (
                        <div className="space-y-2">
                          <Label htmlFor="manager">Manager (optional)</Label>
                          <Select value={newManagerId} onValueChange={setNewManagerId}>
                            <SelectTrigger id="manager" data-testid="select-manager">
                              <SelectValue placeholder="Select a manager" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No manager</SelectItem>
                              {relationshipManagers.map((rm) => (
                                <SelectItem
                                  key={rm.id}
                                  value={rm.id.toString()}
                                  data-testid={`option-manager-${rm.id}`}
                                >
                                  {rm.userId.slice(0, 12)}... (ID: {rm.id})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          resetAddForm();
                        }}
                        data-testid="button-cancel-add"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddMember}
                        disabled={addMemberMutation.isPending}
                        data-testid="button-save-member"
                      >
                        {addMemberMutation.isPending ? "Adding..." : "Add Member"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name / ID</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden md:table-cell">Manager</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!members || members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No team members found
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map((member) => {
                        const managerMember = member.managerId
                          ? members.find((m) => m.id === member.managerId)
                          : null;
                        const RoleIcon = getRoleIcon(member.role);
                        const isCurrentUser = member.id === userRole?.memberId;

                        return (
                          <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {member.userId.slice(0, 16)}...
                                  {isCurrentUser && (
                                    <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                                  )}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Member ID: {member.id}
                                </span>
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
                                <span className="text-sm">
                                  {managerMember.userId.slice(0, 12)}... (ID: {managerMember.id})
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(member)}
                                  data-testid={`button-edit-member-${member.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openDeleteDialog(member)}
                                  disabled={!canDeleteMember(member)}
                                  className={!canDeleteMember(member) ? "opacity-50 cursor-not-allowed" : ""}
                                  data-testid={`button-delete-member-${member.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Pending Invitations</h2>
                <p className="text-sm text-muted-foreground">
                  Email invitations that have been sent but not yet accepted.
                </p>
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitationsLoading ? (
                        <TableRow>
                          <TableCell colSpan={2} className="py-8">
                            <div className="flex justify-center">
                              <Skeleton className="h-8 w-48" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : !pendingInvitations || pendingInvitations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                            No pending invitations
                          </TableCell>
                        </TableRow>
                      ) : (
                        pendingInvitations.map((invitation) => {
                          const RoleIcon = getRoleIcon(invitation.role);
                          const expiresAt = new Date(invitation.expiresAt);
                          const isExpired = expiresAt < new Date();

                          return (
                            <TableRow 
                              key={invitation.id} 
                              data-testid={`row-invitation-${invitation.id}`}
                              className="cursor-pointer hover-elevate"
                              onClick={() => {
                                setSelectedInvitation(invitation);
                                setIsInvitationActionsOpen(true);
                              }}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{invitation.email}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="default"
                                  className={getRoleBadgeClassName(invitation.role)}
                                  data-testid={`badge-invitation-role-${invitation.id}`}
                                >
                                  <RoleIcon className="h-3 w-3 mr-1" />
                                  {getRoleLabel(invitation.role)}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          </>
        )}
      </main>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update the role and manager assignment for this team member.
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Member</Label>
                <p className="text-sm font-medium">{selectedMember.userId}</p>
                <p className="text-xs text-muted-foreground">ID: {selectedMember.id}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editRole}
                  onValueChange={(value: OrgMemberRole) => {
                    setEditRole(value);
                    if (value !== "agent") {
                      setEditManagerId("");
                    }
                  }}
                >
                  <SelectTrigger id="edit-role" data-testid="select-edit-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="master_admin">Master Admin</SelectItem>
                    <SelectItem value="relationship_manager">Relationship Manager</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editRole === "agent" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-manager">Manager (optional)</Label>
                  <Select value={editManagerId} onValueChange={setEditManagerId}>
                    <SelectTrigger id="edit-manager" data-testid="select-edit-manager">
                      <SelectValue placeholder="Select a manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No manager</SelectItem>
                      {relationshipManagers.map((rm) => (
                        <SelectItem
                          key={rm.id}
                          value={rm.id.toString()}
                        >
                          {rm.userId.slice(0, 12)}... (ID: {rm.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedMember(null);
              }}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditMember}
              disabled={updateMemberMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateMemberMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium">{selectedMember?.userId}</span> from the organization?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMemberMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMemberMutation.isPending ? "Removing..." : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isInvitationActionsOpen} onOpenChange={setIsInvitationActionsOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Invitation Options</DialogTitle>
            <DialogDescription>
              Manage this pending invitation
            </DialogDescription>
          </DialogHeader>
          {selectedInvitation && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{selectedInvitation.email}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Role</Label>
                <Badge
                  variant="default"
                  className={getRoleBadgeClassName(selectedInvitation.role)}
                >
                  {getRoleLabel(selectedInvitation.role)}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Expires</Label>
                <p className="text-sm">
                  {format(new Date(selectedInvitation.expiresAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              
              <div className="flex flex-col gap-3 pt-4">
                <Button
                  variant="outline"
                  className="w-full min-h-touch gap-2"
                  onClick={() => resendInvitationMutation.mutate(selectedInvitation.id)}
                  disabled={resendInvitationMutation.isPending}
                  data-testid="button-resend-invitation"
                >
                  <RefreshCw className={`h-4 w-4 ${resendInvitationMutation.isPending ? "animate-spin" : ""}`} />
                  {resendInvitationMutation.isPending ? "Resending..." : "Resend Invitation"}
                </Button>
                <Button
                  variant="destructive"
                  className="w-full min-h-touch gap-2"
                  onClick={() => cancelInvitationMutation.mutate(selectedInvitation.id)}
                  disabled={cancelInvitationMutation.isPending}
                  data-testid="button-delete-invitation"
                >
                  <Trash2 className="h-4 w-4" />
                  {cancelInvitationMutation.isPending ? "Deleting..." : "Delete Invitation"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
