import { useEffect, useState, useCallback } from "react";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Loader2, ShieldAlert } from "lucide-react";

interface CampaignSettings {
  declinedFollowupEnabled: boolean;
  declinedFollowupDays: string;
  declinedFollowupChannel: string;
  declinedFollowupEmailTemplate: string;
  declinedFollowupSmsTemplate: string;
}

export default function AutoCampaignSettings() {
  const { autoFetch, user } = useAutoAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CampaignSettings>({
    declinedFollowupEnabled: false,
    declinedFollowupDays: "3,7,14",
    declinedFollowupChannel: "email",
    declinedFollowupEmailTemplate: "",
    declinedFollowupSmsTemplate: "",
  });

  const isOwnerOrManager = user?.role === "owner" || user?.role === "manager";

  const fetchSettings = useCallback(async () => {
    try {
      const res = await autoFetch("/api/auto/campaign-settings");
      const data = await res.json();
      setForm({
        declinedFollowupEnabled: data.declinedFollowupEnabled ?? false,
        declinedFollowupDays: data.declinedFollowupDays ?? "3,7,14",
        declinedFollowupChannel: data.declinedFollowupChannel ?? "email",
        declinedFollowupEmailTemplate: data.declinedFollowupEmailTemplate ?? "",
        declinedFollowupSmsTemplate: data.declinedFollowupSmsTemplate ?? "",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [autoFetch]);

  useEffect(() => {
    if (isOwnerOrManager) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [fetchSettings, isOwnerOrManager]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await autoFetch("/api/auto/campaign-settings", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      toast({ title: "Campaign settings saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AutoLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AutoLayout>
    );
  }

  if (!isOwnerOrManager) {
    return (
      <AutoLayout>
        <div className="p-4 md:p-6 max-w-2xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <ShieldAlert className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center" data-testid="text-access-denied">
                You do not have permission to access Campaign Settings. Only owners and managers can manage this page.
              </p>
            </CardContent>
          </Card>
        </div>
      </AutoLayout>
    );
  }

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-campaign-settings-title">
          <Settings className="h-5 w-5" /> Campaign Settings
        </h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Declined Service Follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-0.5">
                <Label htmlFor="followup-enabled">Enable Declined Service Follow-ups</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically follow up with customers who declined recommended services
                </p>
              </div>
              <Switch
                id="followup-enabled"
                checked={form.declinedFollowupEnabled}
                onCheckedChange={(checked) => setForm({ ...form, declinedFollowupEnabled: checked })}
                data-testid="switch-followup-enabled"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="followup-days">Follow-up Schedule (days)</Label>
              <Input
                id="followup-days"
                placeholder="3,7,14"
                value={form.declinedFollowupDays}
                onChange={(e) => setForm({ ...form, declinedFollowupDays: e.target.value })}
                data-testid="input-followup-days"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated days after decline to send follow-ups (e.g., 3,7,14)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="followup-channel">Channel</Label>
              <Select
                value={form.declinedFollowupChannel}
                onValueChange={(v) => setForm({ ...form, declinedFollowupChannel: v })}
              >
                <SelectTrigger data-testid="select-followup-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-template">Email Template</Label>
              <Textarea
                id="email-template"
                rows={5}
                placeholder={"Hi {{customerName}},\n\nDuring your recent visit, we recommended {{serviceName}} for your {{vehicleInfo}}. We wanted to follow up and let you know this service is still available.\n\nPlease contact us to schedule at your convenience."}
                value={form.declinedFollowupEmailTemplate}
                onChange={(e) => setForm({ ...form, declinedFollowupEmailTemplate: e.target.value })}
                data-testid="textarea-email-template"
              />
              <p className="text-xs text-muted-foreground">
                {"Available variables: {{customerName}}, {{serviceName}}, {{vehicleInfo}}"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sms-template">SMS Template</Label>
              <Textarea
                id="sms-template"
                rows={3}
                placeholder={"Hi {{customerName}}, your {{vehicleInfo}} may still need {{serviceName}}. Reply or call us to schedule!"}
                value={form.declinedFollowupSmsTemplate}
                onChange={(e) => setForm({ ...form, declinedFollowupSmsTemplate: e.target.value })}
                maxLength={160}
                data-testid="textarea-sms-template"
              />
              <p className="text-xs text-muted-foreground">
                {form.declinedFollowupSmsTemplate.length}/160 characters suggested limit
              </p>
            </div>

            <Button
              className="w-full gap-2"
              onClick={handleSave}
              disabled={saving}
              data-testid="button-save-campaign-settings"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AutoLayout>
  );
}
