import { useEffect, useState, useCallback } from "react";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Eye, Save, Loader2 } from "lucide-react";

const CARD_LABELS: Record<string, string> = {
  revenue: "Revenue",
  carsInShop: "Cars In Shop",
  aro: "Avg Repair Order",
  approvalRate: "Approval Rate",
  feesSaved: "Fees Saved",
  openRos: "Open Repair Orders",
  quickActions: "Quick Actions",
  appointmentsAvailability: "Appointments & Availability",
  shopStats: "Shop Overview",
};

const CARD_KEYS = Object.keys(CARD_LABELS);
const ROLES = ["owner", "manager", "advisor", "tech"] as const;
const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  advisor: "Advisor",
  tech: "Tech",
};

interface VisibilitySetting {
  cardKey: string;
  visibleToOwner: boolean;
  visibleToManager: boolean;
  visibleToAdvisor: boolean;
  visibleToTech: boolean;
}

function getRoleField(role: string): keyof VisibilitySetting {
  const map: Record<string, keyof VisibilitySetting> = {
    owner: "visibleToOwner",
    manager: "visibleToManager",
    advisor: "visibleToAdvisor",
    tech: "visibleToTech",
  };
  return map[role] || "visibleToOwner";
}

const DEFAULT_SETTINGS: VisibilitySetting[] = CARD_KEYS.map((cardKey) => ({
  cardKey,
  visibleToOwner: true,
  visibleToManager: true,
  visibleToAdvisor: true,
  visibleToTech: true,
}));

export default function AutoDashboardVisibility() {
  const { autoFetch, user } = useAutoAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<VisibilitySetting[]>(DEFAULT_SETTINGS);

  const isOwner = user?.role === "owner";

  const fetchVisibility = useCallback(async () => {
    try {
      const res = await autoFetch("/api/auto/dashboard/visibility");
      if (res.ok) {
        const data = await res.json();
        if (data.settings && data.settings.length > 0) {
          const merged = CARD_KEYS.map((cardKey) => {
            const existing = data.settings.find(
              (s: VisibilitySetting) => s.cardKey === cardKey
            );
            return (
              existing || {
                cardKey,
                visibleToOwner: true,
                visibleToManager: true,
                visibleToAdvisor: true,
                visibleToTech: true,
              }
            );
          });
          setSettings(merged);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [autoFetch]);

  useEffect(() => {
    fetchVisibility();
  }, [fetchVisibility]);

  const handleToggle = (cardKey: string, role: string, checked: boolean) => {
    const field = getRoleField(role);
    setSettings((prev) =>
      prev.map((s) => (s.cardKey === cardKey ? { ...s, [field]: checked } : s))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await autoFetch("/api/auto/dashboard/visibility", {
        method: "PUT",
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Visibility settings saved" });
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

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <h1
          className="text-xl font-bold flex items-center gap-2"
          data-testid="text-visibility-title"
        >
          <Eye className="h-5 w-5" /> Dashboard Visibility
        </h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Card Visibility by Role</CardTitle>
            <p className="text-sm text-muted-foreground">
              Control which dashboard cards are visible to each role
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Card</th>
                    {ROLES.map((role) => (
                      <th key={role} className="text-center py-2 px-3 font-medium">
                        {ROLE_LABELS[role]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {settings.map((setting) => (
                    <tr key={setting.cardKey} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 font-medium">
                        {CARD_LABELS[setting.cardKey] || setting.cardKey}
                      </td>
                      {ROLES.map((role) => {
                        const field = getRoleField(role);
                        return (
                          <td key={role} className="text-center py-3 px-3">
                            <div className="flex justify-center">
                              <Switch
                                checked={!!setting[field]}
                                onCheckedChange={(checked) =>
                                  handleToggle(setting.cardKey, role, checked)
                                }
                                disabled={!isOwner}
                                data-testid={`switch-${setting.cardKey}-${role}`}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isOwner && (
              <div className="pt-4 border-t mt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  data-testid="button-save-visibility"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Visibility Settings
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AutoLayout>
  );
}
