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
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Mail, Loader2, Shield, Users } from "lucide-react";

interface StaffUser {
  id: number; firstName: string; lastName: string;
  email: string; role: string; isActive: boolean;
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

export default function AutoStaff() {
  const { autoFetch } = useAutoAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "technician" });
  const [sending, setSending] = useState(false);

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
        method: "POST", body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDialogOpen(false);
      setInviteForm({ email: "", role: "technician" });
      toast({ title: "Invitation Sent", description: `Invitation sent to ${inviteForm.email}` });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSending(false); }
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
                <div key={member.id} className="flex items-center justify-between gap-3 p-3 rounded-md border" data-testid={`staff-${member.id}`}>
                  <div>
                    <p className="font-medium text-sm">{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <Badge variant="outline" className={ROLE_BADGES[member.role] || ""}>
                    <Shield className="h-3 w-3 mr-1" />
                    {member.role.replace("_", " ")}
                  </Badge>
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
    </AutoLayout>
  );
}
