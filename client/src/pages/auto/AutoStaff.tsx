import { useEffect, useState, useCallback } from "react";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Mail, Loader2, Shield, Users, Pencil } from "lucide-react";

interface StaffUser {
  id: number; firstName: string; lastName: string;
  email: string; role: string; isActive: boolean;
  phone: string | null; payType: string | null;
  payRate: string | null; pin: string | null;
}

interface Invitation {
  id: number; email: string; role: string; status: string;
  createdAt: string; expiresAt: string;
}

const ROLE_BADGES: Record<string, string> = {
  owner: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  manager: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  service_advisor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  technician: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const PAY_TYPE_LABELS: Record<string, string> = {
  hourly: "Hourly",
  flat_rate: "Flat Rate",
  salary: "Salary",
};

export default function AutoStaff() {
  const { autoFetch } = useAutoAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "technician", phone: "", payType: "" });
  const [sending, setSending] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<StaffUser | null>(null);
  const [editForm, setEditForm] = useState({ phone: "", role: "", payType: "", payRate: "", pin: "", isActive: true });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const staffRes = await autoFetch("/api/auto/staff");
      const staffData = await staffRes.json();
      setStaff(staffData.users || []);
      setInvitations(staffData.invitations || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [autoFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sendInvite = async () => {
    if (!inviteForm.email) return;
    setSending(true);
    try {
      const res = await autoFetch("/api/auto/staff/invite", {
        method: "POST", body: JSON.stringify({ email: inviteForm.email, role: inviteForm.role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDialogOpen(false);
      setInviteForm({ email: "", role: "technician", phone: "", payType: "" });
      toast({ title: "Invitation Sent", description: `Invitation sent to ${inviteForm.email}` });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  const openEditDialog = (member: StaffUser) => {
    setEditMember(member);
    setEditForm({
      phone: member.phone || "",
      role: member.role,
      payType: member.payType || "",
      payRate: member.payRate || "",
      pin: member.pin || "",
      isActive: member.isActive,
    });
    setEditDialogOpen(true);
  };

  const saveStaffEdit = async () => {
    if (!editMember) return;
    setSaving(true);
    try {
      const res = await autoFetch(`/api/auto/staff/${editMember.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          phone: editForm.phone || null,
          role: editForm.role,
          payType: editForm.payType || null,
          payRate: editForm.payRate || null,
          pin: editForm.pin || null,
          isActive: editForm.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditDialogOpen(false);
      setEditMember(null);
      toast({ title: "Staff Updated", description: "Staff member updated successfully" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const formatPayRate = (payRate: string | null, payType: string | null) => {
    if (!payRate || !payType) return null;
    const rate = parseFloat(payRate);
    if (isNaN(rate)) return null;
    if (payType === "salary") {
      return `$${rate.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/yr`;
    }
    return `$${rate.toFixed(2)}/hr`;
  };

  if (loading) return <AutoLayout><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div></AutoLayout>;

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-staff-title">
            <Users className="h-5 w-5" /> Staff Management
          </h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-invite-staff">
                <UserPlus className="h-4 w-4" /> Invite Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Invite Staff Member</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="staff@example.com"
                    data-testid="input-invite-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                    <SelectTrigger data-testid="select-invite-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="service_advisor">Service Advisor</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Phone (optional)</Label>
                  <Input
                    type="text"
                    value={inviteForm.phone}
                    onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    data-testid="input-invite-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pay Type (optional)</Label>
                  <Select value={inviteForm.payType} onValueChange={(v) => setInviteForm({ ...inviteForm, payType: v })}>
                    <SelectTrigger data-testid="select-invite-pay-type"><SelectValue placeholder="Select pay type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="flat_rate">Flat Rate</SelectItem>
                      <SelectItem value="salary">Salary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  Additional details like pay rate, PIN, and bay assignment can be configured after the staff member registers.
                </p>
                <Button className="w-full" onClick={sendInvite} disabled={sending} data-testid="button-send-invite">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send Invitation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Active Staff ({staff.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {staff.length === 0 ? (
              <p className="text-sm text-muted-foreground">No staff members yet</p>
            ) : (
              staff.map(member => (
                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-md border" data-testid={`staff-${member.id}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                    {member.phone && (
                      <p className="text-xs text-muted-foreground" data-testid={`text-staff-phone-${member.id}`}>{member.phone}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className={ROLE_BADGES[member.role] || ""}>
                      <Shield className="h-3 w-3 mr-1" />
                      {member.role.replace("_", " ")}
                    </Badge>
                    {member.payType && PAY_TYPE_LABELS[member.payType] && (
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-pay-type-${member.id}`}>
                        {PAY_TYPE_LABELS[member.payType]}
                      </Badge>
                    )}
                    {formatPayRate(member.payRate, member.payType) && (
                      <Badge variant="outline" className="text-xs" data-testid={`badge-pay-rate-${member.id}`}>
                        {formatPayRate(member.payRate, member.payType)}
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(member)} data-testid={`button-edit-staff-${member.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {invitations.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Pending Invitations</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {invitations.filter(i => i.status === "pending").map(inv => (
                <div key={inv.id} className="flex items-center justify-between gap-3 p-3 rounded-md border" data-testid={`invite-${inv.id}`}>
                  <div>
                    <p className="text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">Sent {new Date(inv.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">{inv.role.replace("_", " ")}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-staff">
          <DialogHeader><DialogTitle>Edit Staff Member</DialogTitle></DialogHeader>
          {editMember && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="space-y-1 flex-1">
                  <Label className="text-xs text-muted-foreground">First Name</Label>
                  <p className="text-sm font-medium" data-testid="text-edit-first-name">{editMember.firstName}</p>
                </div>
                <div className="space-y-1 flex-1">
                  <Label className="text-xs text-muted-foreground">Last Name</Label>
                  <p className="text-sm font-medium" data-testid="text-edit-last-name">{editMember.lastName}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  data-testid="input-staff-phone"
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                  <SelectTrigger data-testid="select-staff-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="service_advisor">Service Advisor</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pay Type</Label>
                <Select value={editForm.payType} onValueChange={(v) => setEditForm({ ...editForm, payType: v })}>
                  <SelectTrigger data-testid="select-staff-pay-type"><SelectValue placeholder="Select pay type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="flat_rate">Flat Rate</SelectItem>
                    <SelectItem value="salary">Salary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pay Rate {editForm.payType === "salary" ? "($/year)" : "($/hr)"}</Label>
                <Input
                  type="number"
                  value={editForm.payRate}
                  onChange={(e) => setEditForm({ ...editForm, payRate: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-staff-pay-rate"
                />
              </div>

              <div className="space-y-2">
                <Label>PIN (4 digits)</Label>
                <Input
                  type="text"
                  value={editForm.pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setEditForm({ ...editForm, pin: val });
                  }}
                  maxLength={4}
                  placeholder="0000"
                  data-testid="input-staff-pin"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <Label>Active</Label>
                <Switch
                  checked={editForm.isActive}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
                  data-testid="switch-staff-active"
                />
              </div>

              <Button className="w-full" onClick={saveStaffEdit} disabled={saving} data-testid="button-save-staff">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AutoLayout>
  );
}
