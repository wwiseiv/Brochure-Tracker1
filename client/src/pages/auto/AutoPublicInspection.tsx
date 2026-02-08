import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, Loader2, Wrench, Phone, MapPin } from "lucide-react";

interface InspectionItem {
  id: number;
  categoryName: string;
  itemName: string;
  condition: string;
  notes: string | null;
  photoUrls: string[] | null;
  sortOrder: number;
}

interface InspectionData {
  inspection: {
    id: number;
    vehicleMileage: number | null;
    overallCondition: string | null;
    status: string;
    notes: string | null;
    createdAt: string;
  };
  shop: { name: string; phone: string | null; address: string | null; city: string | null; state: string | null; zip: string | null } | null;
  customer: { firstName: string } | null;
  vehicle: { year: number | null; make: string | null; model: string | null; color: string | null; licensePlate: string | null } | null;
  technician: { firstName: string; lastName: string } | null;
  items: InspectionItem[];
  repairOrder: { roNumber: string } | null;
}

function ConditionIcon({ condition }: { condition: string }) {
  if (condition === "good") return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500 shrink-0" />;
  if (condition === "fair") return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0" />;
  return <XCircle className="h-5 w-5 text-red-600 dark:text-red-500 shrink-0" />;
}

function ConditionBadge({ condition, count }: { condition: string; count: number }) {
  const variants: Record<string, string> = {
    good: "bg-green-600 dark:bg-green-700 text-white",
    fair: "bg-yellow-600 dark:bg-yellow-700 text-white",
    poor: "bg-red-600 dark:bg-red-700 text-white",
  };
  const labels: Record<string, string> = { good: "Good", fair: "Fair", poor: "Poor" };
  return (
    <Badge className={`${variants[condition] || ""} no-default-hover-elevate no-default-active-elevate`} data-testid={`badge-condition-${condition}`}>
      {labels[condition] || condition}: {count}
    </Badge>
  );
}

export default function AutoPublicInspection() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const { data, isLoading, error } = useQuery<InspectionData>({
    queryKey: ["/api/auto/dvi/public", token],
    queryFn: async () => {
      const res = await fetch(`/api/auto/dvi/public/${token}`);
      if (!res.ok) throw new Error("Inspection not found");
      return res.json();
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="loading-state">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading inspection report...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="error-state">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-red-600 dark:text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Inspection Not Found</h2>
            <p className="text-sm text-muted-foreground">This inspection link may be invalid or expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { inspection, shop, customer, vehicle, technician, items, repairOrder } = data;

  const conditionCounts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.condition] = (acc[item.condition] || 0) + 1;
    return acc;
  }, {});

  const categories = items.reduce<Record<string, InspectionItem[]>>((acc, item) => {
    if (!acc[item.categoryName]) acc[item.categoryName] = [];
    acc[item.categoryName].push(item);
    return acc;
  }, {});

  const vehicleLabel = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")
    : "Vehicle";

  const inspectionDate = new Date(inspection.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background" data-testid="public-inspection-page">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {shop && (
          <div className="text-center space-y-1 pb-2" data-testid="shop-header">
            <h1 className="text-2xl font-bold" data-testid="text-shop-name">{shop.name}</h1>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
              {shop.phone && (
                <span className="flex items-center gap-1" data-testid="text-shop-phone">
                  <Phone className="h-3.5 w-3.5" /> {shop.phone}
                </span>
              )}
              {shop.address && (
                <span className="flex items-center gap-1" data-testid="text-shop-address">
                  <MapPin className="h-3.5 w-3.5" />
                  {[shop.address, shop.city, shop.state, shop.zip].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          </div>
        )}

        <Card data-testid="vehicle-info-card">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold" data-testid="text-vehicle-label">{vehicleLabel}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {vehicle?.color && <span data-testid="text-vehicle-color">{vehicle.color}</span>}
                    {vehicle?.licensePlate && <span data-testid="text-vehicle-plate">{vehicle.licensePlate}</span>}
                  </div>
                </div>
              </div>
              <div className="text-right text-sm">
                {repairOrder && <p className="text-muted-foreground" data-testid="text-ro-number">RO #{repairOrder.roNumber}</p>}
                {inspection.vehicleMileage && <p className="text-muted-foreground" data-testid="text-mileage">{inspection.vehicleMileage.toLocaleString()} mi</p>}
              </div>
            </div>
            {customer && (
              <p className="text-sm text-muted-foreground mt-2" data-testid="text-customer-greeting">
                Prepared for {customer.firstName}
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="summary-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Inspection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2" data-testid="condition-summary">
              {conditionCounts.good > 0 && <ConditionBadge condition="good" count={conditionCounts.good} />}
              {conditionCounts.fair > 0 && <ConditionBadge condition="fair" count={conditionCounts.fair} />}
              {conditionCounts.poor > 0 && <ConditionBadge condition="poor" count={conditionCounts.poor} />}
            </div>
            {inspection.notes && (
              <p className="text-sm text-muted-foreground mt-3" data-testid="text-inspection-notes">{inspection.notes}</p>
            )}
          </CardContent>
        </Card>

        {Object.entries(categories).map(([categoryName, categoryItems]) => (
          <Card key={categoryName} data-testid={`card-category-${categoryName.replace(/\s+/g, "-").toLowerCase()}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{categoryName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {categoryItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 py-2 border-b last:border-b-0 border-border"
                  data-testid={`item-${item.id}`}
                >
                  <ConditionIcon condition={item.condition} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" data-testid={`text-item-name-${item.id}`}>{item.itemName}</p>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-item-notes-${item.id}`}>{item.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <div className="text-center space-y-1 pt-2 pb-6 text-sm text-muted-foreground" data-testid="inspection-footer">
          {technician && (
            <p data-testid="text-technician">
              Inspected by {technician.firstName} {technician.lastName}
            </p>
          )}
          <p data-testid="text-inspection-date">{inspectionDate}</p>
          <p className="text-xs pt-2" data-testid="text-powered-by">Powered by PCB Auto</p>
        </div>
      </div>
    </div>
  );
}
