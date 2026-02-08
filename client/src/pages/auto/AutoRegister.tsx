import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Wrench, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AutoRegister() {
  const { register } = useAutoAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{ email: string; role: string; shopName: string } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", password: "", confirmPassword: "", phone: "" });

  const token = new URLSearchParams(searchString).get("token");

  useEffect(() => {
    if (!token) { setInviteError("No invitation token provided"); return; }
    fetch(`/api/auto/auth/invitation/${token}`)
      .then((res) => { if (!res.ok) throw new Error("Invalid invitation"); return res.json(); })
      .then(setInviteInfo)
      .catch((err) => setInviteError(err.message));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await register(token!, form.firstName, form.lastName, form.password, form.phone);
      setLocation("/auto/dashboard");
    } catch (err: any) {
      toast({ title: "Registration Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (inviteError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">{inviteError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-lg bg-primary mb-3">
            <Wrench className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">Create Your Account</CardTitle>
          {inviteInfo && (
            <CardDescription>
              You've been invited to join <strong>{inviteInfo.shopName}</strong> as a{" "}
              <strong className="capitalize">{inviteInfo.role.replace("_", " ")}</strong>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {inviteInfo && (
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={inviteInfo.email} disabled data-testid="input-invite-email" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required data-testid="input-first-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required data-testid="input-last-name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-phone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} data-testid="input-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required data-testid="input-confirm-password" />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="button-register">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Account
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
