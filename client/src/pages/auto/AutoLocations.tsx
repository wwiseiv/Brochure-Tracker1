import { useEffect, useState, useCallback } from "react";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, Loader2, Pencil, X, Save, Phone } from "lucide-react";

interface Location {
  id: number;
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  isPrimary: boolean;
  isActive: boolean;
}

interface LocationForm {
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

const emptyForm: LocationForm = {
  name: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
};

function formatAddress(loc: Location): string | null {
  const parts: string[] = [];
  if (loc.addressLine1) parts.push(loc.addressLine1);
  if (loc.addressLine2) parts.push(loc.addressLine2);
  const cityStateZip: string[] = [];
  if (loc.city) cityStateZip.push(loc.city);
  if (loc.state) cityStateZip.push(loc.state);
  if (loc.zip) cityStateZip.push(loc.zip);
  if (cityStateZip.length > 0) parts.push(cityStateZip.join(", "));
  return parts.length > 0 ? parts.join(", ") : null;
}

function LocationFormFields({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  testIdPrefix,
}: {
  form: LocationForm;
  setForm: (f: LocationForm) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  testIdPrefix: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Location name"
            data-testid={`${testIdPrefix}-input-name`}
          />
        </div>
        <div className="space-y-2">
          <Label>Address Line 1</Label>
          <Input
            value={form.addressLine1}
            onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
            placeholder="Street address"
            data-testid={`${testIdPrefix}-input-address1`}
          />
        </div>
        <div className="space-y-2">
          <Label>Address Line 2</Label>
          <Input
            value={form.addressLine2}
            onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
            placeholder="Suite, unit, etc."
            data-testid={`${testIdPrefix}-input-address2`}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>City</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="City"
              data-testid={`${testIdPrefix}-input-city`}
            />
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Input
              maxLength={2}
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
              placeholder="TX"
              data-testid={`${testIdPrefix}-input-state`}
            />
          </div>
          <div className="space-y-2">
            <Label>ZIP</Label>
            <Input
              value={form.zip}
              onChange={(e) => setForm({ ...form, zip: e.target.value })}
              placeholder="ZIP code"
              data-testid={`${testIdPrefix}-input-zip`}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="(555) 123-4567"
            data-testid={`${testIdPrefix}-input-phone`}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={onSave}
            disabled={saving || !form.name.trim()}
            className="gap-2"
            data-testid={`${testIdPrefix}-button-save`}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button variant="outline" onClick={onCancel} data-testid={`${testIdPrefix}-button-cancel`}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AutoLocations() {
  const { autoFetch, user } = useAutoAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<LocationForm>({ ...emptyForm });
  const [addSaving, setAddSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<LocationForm>({ ...emptyForm });
  const [editSaving, setEditSaving] = useState(false);

  const isOwnerOrManager = user?.role === "owner" || user?.role === "manager";

  const fetchLocations = useCallback(async () => {
    try {
      const res = await autoFetch("/api/auto/locations");
      const data = await res.json();
      setLocations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [autoFetch]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleAdd = async () => {
    if (!addForm.name.trim()) return;
    setAddSaving(true);
    try {
      const res = await autoFetch("/api/auto/locations", {
        method: "POST",
        body: JSON.stringify({
          name: addForm.name.trim(),
          addressLine1: addForm.addressLine1 || undefined,
          addressLine2: addForm.addressLine2 || undefined,
          city: addForm.city || undefined,
          state: addForm.state || undefined,
          zip: addForm.zip || undefined,
          phone: addForm.phone || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create location");
      const newLoc = await res.json();
      setLocations((prev) => [...prev, newLoc]);
      setAddForm({ ...emptyForm });
      setShowAddForm(false);
      toast({ title: "Location added" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddSaving(false);
    }
  };

  const startEdit = (loc: Location) => {
    setEditingId(loc.id);
    setEditForm({
      name: loc.name,
      addressLine1: loc.addressLine1 || "",
      addressLine2: loc.addressLine2 || "",
      city: loc.city || "",
      state: loc.state || "",
      zip: loc.zip || "",
      phone: loc.phone || "",
    });
  };

  const handleEdit = async () => {
    if (!editForm.name.trim() || editingId === null) return;
    setEditSaving(true);
    try {
      const res = await autoFetch(`/api/auto/locations/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name.trim(),
          addressLine1: editForm.addressLine1 || null,
          addressLine2: editForm.addressLine2 || null,
          city: editForm.city || null,
          state: editForm.state || null,
          zip: editForm.zip || null,
          phone: editForm.phone || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update location");
      const updated = await res.json();
      setLocations((prev) => prev.map((l) => (l.id === editingId ? updated : l)));
      setEditingId(null);
      toast({ title: "Location updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  const toggleActive = async (loc: Location) => {
    try {
      const res = await autoFetch(`/api/auto/locations/${loc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !loc.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update location");
      const updated = await res.json();
      setLocations((prev) => prev.map((l) => (l.id === loc.id ? updated : l)));
      toast({ title: `Location ${updated.isActive ? "activated" : "deactivated"}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-locations-title">
            <MapPin className="h-5 w-5" /> Locations
          </h1>
          {isOwnerOrManager && !showAddForm && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="gap-2"
              data-testid="button-add-location"
            >
              <Plus className="h-4 w-4" /> Add Location
            </Button>
          )}
        </div>

        {showAddForm && isOwnerOrManager && (
          <LocationFormFields
            form={addForm}
            setForm={setAddForm}
            onSave={handleAdd}
            onCancel={() => {
              setShowAddForm(false);
              setAddForm({ ...emptyForm });
            }}
            saving={addSaving}
            testIdPrefix="add-location"
          />
        )}

        {locations.length === 0 && !showAddForm && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <MapPin className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center" data-testid="text-no-locations">
                No locations added yet.
              </p>
            </CardContent>
          </Card>
        )}

        {locations.map((loc, index) => (
          <div key={loc.id}>
            {editingId === loc.id && isOwnerOrManager ? (
              <LocationFormFields
                form={editForm}
                setForm={setEditForm}
                onSave={handleEdit}
                onCancel={() => setEditingId(null)}
                saving={editSaving}
                testIdPrefix={`edit-location-${loc.id}`}
              />
            ) : (
              <Card data-testid={`card-location-${loc.id}`}>
                <CardContent className="pt-5 space-y-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" data-testid={`text-location-name-${loc.id}`}>
                        {loc.name}
                      </span>
                      <Badge variant="outline" className="text-xs" data-testid={`badge-location-number-${loc.id}`}>
                        Location #{index + 1}
                      </Badge>
                      {loc.isPrimary && (
                        <Badge variant="default" className="text-xs" data-testid={`badge-primary-${loc.id}`}>
                          Primary
                        </Badge>
                      )}
                      <Badge
                        variant={loc.isActive ? "default" : "secondary"}
                        className="text-xs"
                        data-testid={`badge-status-${loc.id}`}
                      >
                        {loc.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {isOwnerOrManager && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEdit(loc)}
                          data-testid={`button-edit-location-${loc.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActive(loc)}
                          data-testid={`button-toggle-active-${loc.id}`}
                        >
                          {loc.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    )}
                  </div>
                  {formatAddress(loc) && (
                    <p className="text-sm text-muted-foreground" data-testid={`text-location-address-${loc.id}`}>
                      {formatAddress(loc)}
                    </p>
                  )}
                  {loc.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1" data-testid={`text-location-phone-${loc.id}`}>
                      <Phone className="h-3 w-3" /> {loc.phone}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ))}
      </div>
    </AutoLayout>
  );
}
