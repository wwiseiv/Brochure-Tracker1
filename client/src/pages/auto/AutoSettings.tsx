import { useEffect, useState, useCallback } from "react";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Loader2, Plus, Trash2, Upload, ImageIcon } from "lucide-react";

interface Bay { id: number; name: string; isActive: boolean; }

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu",
];

export default function AutoSettings() {
  const { autoFetch, shop, user } = useAutoAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [bays, setBays] = useState<Bay[]>([]);
  const [newBayName, setNewBayName] = useState("");
  const [form, setForm] = useState({
    name: "", address: "", city: "", state: "", zip: "",
    phone: "", email: "", timezone: "America/New_York",
    laborRate: "0", cardFeePercent: "3.5",
    partsTaxRate: "0", laborTaxRate: "0", laborTaxable: true,
    defaultPartsMarkupPct: "0", shopSupplyMethod: "none",
  });

  const isOwner = user?.role === "owner";

  const fetchSettings = useCallback(async () => {
    try {
      const [settingsRes, baysRes] = await Promise.all([
        autoFetch("/api/auto/shop/settings"),
        autoFetch("/api/auto/bays"),
      ]);
      const s = await settingsRes.json();
      setBays(await baysRes.json());
      setLogoUrl(s.logoUrl || null);
      setForm({
        name: s.name || "", address: s.address || "", city: s.city || "",
        state: s.state || "", zip: s.zip || "", phone: s.phone || "",
        email: s.email || "", timezone: s.timezone || "America/New_York",
        laborRate: s.laborRate || "0",
        cardFeePercent: parseFloat((parseFloat(s.cardFeePercent || "0") * 100).toFixed(4)).toString(),
        partsTaxRate: parseFloat((parseFloat(s.partsTaxRate || "0") * 100).toFixed(4)).toString(),
        laborTaxRate: parseFloat((parseFloat(s.laborTaxRate || "0") * 100).toFixed(4)).toString(),
        laborTaxable: s.laborTaxable !== false,
        defaultPartsMarkupPct: s.defaultPartsMarkupPct || "0",
        shopSupplyMethod: s.shopSupplyMethod || "none",
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [autoFetch]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        cardFeePercent: (parseFloat(form.cardFeePercent || "0") / 100).toString(),
        partsTaxRate: (parseFloat(form.partsTaxRate || "0") / 100).toString(),
        laborTaxRate: (parseFloat(form.laborTaxRate || "0") / 100).toString(),
      };
      const res = await autoFetch("/api/auto/shop/settings", { method: "PATCH", body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Settings Saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const addBay = async () => {
    if (!newBayName.trim()) return;
    try {
      const res = await autoFetch("/api/auto/bays", {
        method: "POST", body: JSON.stringify({ name: newBayName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add bay");
      const bay = await res.json();
      setBays([...bays, bay]);
      setNewBayName("");
      toast({ title: "Bay Added" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await autoFetch("/api/auto/logo/upload", {
        method: "POST",
        body: formData,
        rawBody: true,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setLogoUrl(data.logoUrl);
      toast({ title: "Logo Updated" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to upload logo", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const res = await autoFetch("/api/auto/shop/settings", {
        method: "PATCH",
        body: JSON.stringify({ logoUrl: null }),
      });
      if (!res.ok) throw new Error("Failed to remove logo");
      setLogoUrl(null);
      toast({ title: "Logo Removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteBay = async (id: number) => {
    try {
      await autoFetch(`/api/auto/bays/${id}`, { method: "DELETE" });
      setBays(bays.filter(b => b.id !== id));
      toast({ title: "Bay Removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <AutoLayout><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div></AutoLayout>;

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-settings-title">
          <Settings className="h-5 w-5" /> Shop Settings
        </h1>

        <Card>
          <CardHeader><CardTitle className="text-base">Shop Logo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {logoUrl ? (
              <div className="flex flex-col items-center gap-3">
                <div className="border rounded-md p-4 flex items-center justify-center w-full">
                  <img
                    src={logoUrl}
                    alt="Shop logo"
                    className="max-h-[120px] object-contain"
                    data-testid="img-shop-logo"
                  />
                </div>
              </div>
            ) : (
              <div className="border rounded-md p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImageIcon className="h-10 w-10" />
                <span className="text-sm">No logo uploaded</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Recommended: 300x100px. Any size accepted - your logo will be automatically scaled to fit.
            </p>
            {(isOwner || user?.role === "manager") && (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="file"
                  id="logo-upload"
                  className="hidden"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("logo-upload")?.click()}
                  disabled={uploadingLogo}
                  data-testid="button-upload-logo"
                >
                  {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  {uploadingLogo ? "Uploading..." : "Upload Logo"}
                </Button>
                {logoUrl && (
                  <Button
                    variant="ghost"
                    onClick={handleRemoveLogo}
                    data-testid="button-remove-logo"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Logo
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Shop Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Shop Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!isOwner} data-testid="input-shop-name" />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} disabled={!isOwner} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} disabled={!isOwner} /></div>
              <div className="space-y-2"><Label>State</Label><Input maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} disabled={!isOwner} /></div>
              <div className="space-y-2"><Label>ZIP</Label><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} disabled={!isOwner} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!isOwner} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!isOwner} /></div>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })} disabled={!isOwner}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pricing & Rates</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Labor Rate ($/hr)</Label><Input type="number" step="0.01" value={form.laborRate} onChange={(e) => setForm({ ...form, laborRate: e.target.value })} disabled={!isOwner} data-testid="input-labor-rate" /></div>
              <div className="space-y-2">
                <Label>Dual Pricing Rate (%)</Label>
                <Input type="number" step="0.01" value={form.cardFeePercent} onChange={(e) => setForm({ ...form, cardFeePercent: e.target.value })} disabled={!isOwner} data-testid="input-card-fee" />
                <p className="text-xs text-muted-foreground">The difference between your cash price and card price. Card Price = Cash Price + (Cash Price x Rate)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Tax Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Parts Tax Rate (%)</Label>
                <Input type="number" step="0.001" value={form.partsTaxRate} onChange={(e) => setForm({ ...form, partsTaxRate: e.target.value })} disabled={!isOwner} data-testid="input-parts-tax-rate" />
                <p className="text-xs text-muted-foreground">e.g., 0.085 = 8.5%</p>
              </div>
              <div className="space-y-2">
                <Label>Labor Tax Rate (%)</Label>
                <Input type="number" step="0.001" value={form.laborTaxRate} onChange={(e) => setForm({ ...form, laborTaxRate: e.target.value })} disabled={!isOwner} data-testid="input-labor-tax-rate" />
                <p className="text-xs text-muted-foreground">e.g., 0.085 = 8.5%</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="laborTaxable"
                checked={form.laborTaxable}
                onCheckedChange={(checked) => setForm({ ...form, laborTaxable: !!checked })}
                disabled={!isOwner}
                data-testid="checkbox-labor-taxable"
              />
              <Label htmlFor="laborTaxable" className="cursor-pointer">Labor Taxable</Label>
              <p className="text-xs text-muted-foreground">When off, labor/sublet items are not taxed</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Default Parts Markup (%)</Label>
                <Input type="number" step="0.01" value={form.defaultPartsMarkupPct} onChange={(e) => setForm({ ...form, defaultPartsMarkupPct: e.target.value })} disabled={!isOwner} data-testid="input-parts-markup" />
              </div>
              <div className="space-y-2">
                <Label>Shop Supply Method</Label>
                <Select value={form.shopSupplyMethod} onValueChange={(v) => setForm({ ...form, shopSupplyMethod: v })} disabled={!isOwner}>
                  <SelectTrigger data-testid="select-shop-supply-method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="percent">% of Labor</SelectItem>
                    <SelectItem value="flat">Flat Fee per RO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isOwner && (
          <Button className="w-full gap-2" onClick={handleSave} disabled={saving} data-testid="button-save-settings">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </Button>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Service Bays</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {bays.map(bay => (
              <div key={bay.id} className="flex items-center justify-between gap-3 p-2 rounded-md border" data-testid={`bay-${bay.id}`}>
                <span className="text-sm font-medium">{bay.name}</span>
                {isOwner && (
                  <Button variant="ghost" size="icon" onClick={() => deleteBay(bay.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            {isOwner && (
              <div className="flex items-center gap-2">
                <Input placeholder="New bay name" value={newBayName} onChange={(e) => setNewBayName(e.target.value)} data-testid="input-new-bay" />
                <Button variant="outline" onClick={addBay} data-testid="button-add-bay"><Plus className="h-4 w-4" /></Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AutoLayout>
  );
}
