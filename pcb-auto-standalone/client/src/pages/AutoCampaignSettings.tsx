import { useEffect, useState, useCallback, useRef } from "react";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Loader2, ShieldAlert, Plus, X } from "lucide-react";

const DEFAULT_EMAIL_TEMPLATE = `Hi {customer_name},

During your recent visit to {shop_name}, our technician recommended the following service for your {vehicle_year_make_model}:

\u2022 {service_description}

This recommendation was made to help keep your vehicle running safely and reliably. We wanted to follow up in case you'd like to schedule this service.

Give us a call at {shop_phone} or reply to this email to set up an appointment.

Thank you,
{shop_name}`;

const DEFAULT_SMS_TEMPLATE = `Hi {customer_name}, {shop_name} here. We recommended {service_description} for your {vehicle_year_make_model}. Ready to schedule? Call {shop_phone}. Reply STOP to opt out.`;

const MERGE_FIELDS = [
  "{customer_name}",
  "{vehicle_year_make_model}",
  "{service_description}",
  "{shop_name}",
  "{shop_phone}",
];

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
  const [newDayValue, setNewDayValue] = useState("");

  const emailTemplateRef = useRef<HTMLTextAreaElement>(null);
  const smsTemplateRef = useRef<HTMLTextAreaElement>(null);

  const isOwnerOrManager = user?.role === "owner" || user?.role === "manager";

  const dayIntervals = form.declinedFollowupDays
    .split(",")
    .map((d) => d.trim())
    .filter((d) => d && !isNaN(Number(d)))
    .map(Number);

  const setDayIntervals = (days: number[]) => {
    setForm({ ...form, declinedFollowupDays: days.join(",") });
  };

  const addDayInterval = () => {
    const val = parseInt(newDayValue);
    if (!val || val <= 0 || dayIntervals.includes(val)) return;
    const updated = [...dayIntervals, val].sort((a, b) => a - b);
    setDayIntervals(updated);
    setNewDayValue("");
  };

  const removeDayInterval = (day: number) => {
    setDayIntervals(dayIntervals.filter((d) => d !== day));
  };

  const insertMergeField = (field: string, target: "email" | "sms") => {
    const ref = target === "email" ? emailTemplateRef : smsTemplateRef;
    const templateKey = target === "email" ? "declinedFollowupEmailTemplate" : "declinedFollowupSmsTemplate";
    const textarea = ref.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = form[templateKey];
    const newValue = currentValue.substring(0, start) + field + currentValue.substring(end);
    setForm({ ...form, [templateKey]: newValue });

    requestAnimationFrame(() => {
      textarea.focus();
      const newCursorPos = start + field.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  const fetchSettings = useCallback(async () => {
    try {
      const res = await autoFetch("/api/campaign-settings");
      const data = await res.json();
      setForm({
        declinedFollowupEnabled: data.declinedFollowupEnabled ?? false,
        declinedFollowupDays: data.declinedFollowupDays ?? "3,7,14",
        declinedFollowupChannel: data.declinedFollowupChannel ?? "email",
        declinedFollowupEmailTemplate: data.declinedFollowupEmailTemplate || DEFAULT_EMAIL_TEMPLATE,
        declinedFollowupSmsTemplate: data.declinedFollowupSmsTemplate || DEFAULT_SMS_TEMPLATE,
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
      const res = await autoFetch("/api/campaign-settings", {
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

  const smsLength = form.declinedFollowupSmsTemplate.length;
  const smsOverLimit = smsLength > 160;

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
              <Label>Follow-up Day Intervals</Label>
              <div className="flex flex-wrap items-center gap-2">
                {dayIntervals.map((day) => (
                  <div key={day} className="flex items-center gap-1">
                    <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate gap-1" data-testid={`badge-day-${day}`}>
                      Day {day}
                      <button
                        onClick={() => removeDayInterval(day)}
                        className="ml-0.5"
                        data-testid={`button-remove-day-${day}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </div>
                ))}
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    placeholder="Days"
                    value={newDayValue}
                    onChange={(e) => setNewDayValue(e.target.value)}
                    className="w-20"
                    min={1}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDayInterval(); } }}
                    data-testid="input-new-day-interval"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addDayInterval}
                    disabled={!newDayValue || parseInt(newDayValue) <= 0}
                    data-testid="button-add-day-interval"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Number of days after decline to send follow-up messages
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
                ref={emailTemplateRef}
                id="email-template"
                rows={12}
                value={form.declinedFollowupEmailTemplate}
                onChange={(e) => setForm({ ...form, declinedFollowupEmailTemplate: e.target.value })}
                data-testid="textarea-email-template"
              />
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground mr-1">Merge fields:</span>
                {MERGE_FIELDS.map((field) => (
                  <Badge
                    key={`email-${field}`}
                    variant="outline"
                    className="cursor-pointer text-xs"
                    onClick={() => insertMergeField(field, "email")}
                    data-testid={`badge-email-merge-${field.replace(/[{}]/g, "")}`}
                  >
                    {field}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sms-template">SMS Template</Label>
              <Textarea
                ref={smsTemplateRef}
                id="sms-template"
                rows={4}
                value={form.declinedFollowupSmsTemplate}
                onChange={(e) => setForm({ ...form, declinedFollowupSmsTemplate: e.target.value })}
                data-testid="textarea-sms-template"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground mr-1">Merge fields:</span>
                  {MERGE_FIELDS.map((field) => (
                    <Badge
                      key={`sms-${field}`}
                      variant="outline"
                      className="cursor-pointer text-xs"
                      onClick={() => insertMergeField(field, "sms")}
                      data-testid={`badge-sms-merge-${field.replace(/[{}]/g, "")}`}
                    >
                      {field}
                    </Badge>
                  ))}
                </div>
                <span
                  className={`text-xs font-medium ${smsOverLimit ? "text-destructive" : "text-muted-foreground"}`}
                  data-testid="text-sms-char-count"
                >
                  Characters: {smsLength}/160
                </span>
              </div>
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
