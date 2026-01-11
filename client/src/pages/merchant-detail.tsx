import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessTypeIcon, businessTypeLabels } from "@/components/BusinessTypeIcon";
import { StatusBadge } from "@/components/StatusBadge";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  TrendingUp,
  FileText,
  ChevronRight,
  Navigation,
  Edit2,
  Loader2,
  Store,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarPlus,
  RefreshCw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { Merchant, DropWithBrochure, BusinessType, OutcomeType, DropStatus } from "@shared/schema";

const outcomeIcons: Record<OutcomeType, typeof CheckCircle2> = {
  signed: CheckCircle2,
  interested_appointment: CalendarPlus,
  interested_later: RefreshCw,
  not_interested: XCircle,
  closed: AlertCircle,
  not_found: AlertCircle,
};

const outcomeLabels: Record<OutcomeType, string> = {
  signed: "Signed",
  interested_appointment: "Appointment Set",
  interested_later: "Follow Up Later",
  not_interested: "Not Interested",
  closed: "Business Closed",
  not_found: "Not Found",
};

const outcomeColors: Record<OutcomeType, string> = {
  signed: "text-emerald-600",
  interested_appointment: "text-blue-600",
  interested_later: "text-amber-600",
  not_interested: "text-gray-600",
  closed: "text-red-600",
  not_found: "text-gray-600",
};

function DetailSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-start gap-4">
        <Skeleton className="w-16 h-16 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}

function VisitCard({ drop }: { drop: DropWithBrochure }) {
  const OutcomeIcon = drop.outcome ? outcomeIcons[drop.outcome as OutcomeType] : null;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={drop.status as DropStatus} />
            {drop.outcome && OutcomeIcon && (
              <span className={`flex items-center gap-1 text-xs ${outcomeColors[drop.outcome as OutcomeType]}`}>
                <OutcomeIcon className="w-3 h-3" />
                {outcomeLabels[drop.outcome as OutcomeType]}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(drop.droppedAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
          {drop.textNotes && (
            <p className="text-sm mt-2 line-clamp-2">{drop.textNotes}</p>
          )}
        </div>
        <a href={`/drops/${drop.id}`}>
          <Button variant="ghost" size="icon" data-testid={`button-view-drop-${drop.id}`}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </a>
      </div>
    </Card>
  );
}

export default function MerchantDetailPage() {
  const [, params] = useRoute("/merchants/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");

  const merchantId = params?.id;

  const { data: merchant, isLoading: merchantLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchants", merchantId],
    enabled: !!merchantId,
  });

  const { data: visits, isLoading: visitsLoading } = useQuery<DropWithBrochure[]>({
    queryKey: ["/api/merchants", merchantId, "visits"],
    enabled: !!merchantId,
  });

  const updateMerchantMutation = useMutation({
    mutationFn: async (data: Partial<Merchant>) => {
      const response = await apiRequest("PATCH", `/api/merchants/${merchantId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchants", merchantId] });
      setShowNotesDialog(false);
      toast({
        title: "Notes updated",
        description: "Merchant notes have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleOpenNotesDialog = () => {
    setEditedNotes(merchant?.notes || "");
    setShowNotesDialog(true);
  };

  const handleSaveNotes = () => {
    updateMerchantMutation.mutate({ notes: editedNotes });
  };

  const handleCall = () => {
    if (merchant?.businessPhone) {
      window.location.href = `tel:${merchant.businessPhone}`;
    }
  };

  const handleDirections = () => {
    if (merchant?.latitude && merchant?.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${merchant.latitude},${merchant.longitude}`,
        "_blank"
      );
    } else if (merchant?.address) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(merchant.address)}`,
        "_blank"
      );
    }
  };

  const leadScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-emerald-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const conversionRate = merchant && merchant.totalDrops && merchant.totalDrops > 0
    ? Math.round(((merchant.totalConversions || 0) / merchant.totalDrops) * 100)
    : 0;

  if (merchantLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="container max-w-md mx-auto px-4 h-14 flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/merchants")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-semibold">Merchant Details</span>
          </div>
        </header>
        <main className="container max-w-md mx-auto">
          <DetailSkeleton />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="container max-w-md mx-auto px-4 h-14 flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/merchants")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-semibold">Merchant Not Found</span>
          </div>
        </header>
        <main className="container max-w-md mx-auto px-4 py-12 text-center">
          <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Merchant not found</h2>
          <p className="text-muted-foreground mb-6">
            This merchant may have been removed or doesn't exist.
          </p>
          <Button 
            className="min-h-touch" 
            onClick={() => navigate("/merchants")}
            data-testid="button-go-to-merchants"
          >
            Go to Merchants
          </Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md mx-auto px-4 h-14 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/merchants")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-semibold truncate flex-1">{merchant.businessName}</span>
        </div>
      </header>

      <main className="container max-w-md mx-auto px-4 py-6 space-y-6">
        <section className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BusinessTypeIcon 
              type={merchant.businessType as BusinessType || "other"} 
              className="w-8 h-8 text-primary" 
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold">{merchant.businessName}</h1>
            <p className="text-muted-foreground">
              {merchant.businessType
                ? businessTypeLabels[merchant.businessType as BusinessType]
                : "Business"}
            </p>
            {merchant.contactName && (
              <p className="text-sm text-muted-foreground mt-1">
                Contact: {merchant.contactName}
              </p>
            )}
          </div>
        </section>

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold">{merchant.totalDrops || 0}</div>
            <div className="text-xs text-muted-foreground">Total Drops</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {merchant.totalConversions || 0}
            </div>
            <div className="text-xs text-muted-foreground">Conversions</div>
          </Card>
          <Card className="p-3 text-center">
            <div className={`text-2xl font-bold ${leadScoreColor(merchant.leadScore)}`}>
              {merchant.leadScore ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground">Lead Score</div>
          </Card>
        </div>

        {conversionRate > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="font-medium">Conversion Rate</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(conversionRate, 100)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {conversionRate}% ({merchant.totalConversions || 0} of {merchant.totalDrops || 0})
            </p>
          </Card>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3">Contact Info</h2>
          <Card className="divide-y divide-border">
            {merchant.businessPhone && (
              <div className="flex items-center gap-3 p-4">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{merchant.businessPhone}</p>
                  <p className="text-sm text-muted-foreground">Phone</p>
                </div>
              </div>
            )}
            {merchant.email && (
              <div className="flex items-center gap-3 p-4">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium truncate">{merchant.email}</p>
                  <p className="text-sm text-muted-foreground">Email</p>
                </div>
              </div>
            )}
            {merchant.address && (
              <div className="flex items-center gap-3 p-4">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{merchant.address}</p>
                  <p className="text-sm text-muted-foreground">Address</p>
                </div>
              </div>
            )}
            {merchant.lastVisitAt && (
              <div className="flex items-center gap-3 p-4">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">
                    {format(new Date(merchant.lastVisitAt), "MMM d, yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Last Visit ({formatDistanceToNow(new Date(merchant.lastVisitAt), { addSuffix: true })})
                  </p>
                </div>
              </div>
            )}
          </Card>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Notes</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleOpenNotesDialog}
              data-testid="button-edit-notes"
            >
              <Edit2 className="w-4 h-4 mr-1" />
              Edit
            </Button>
          </div>
          <Card className="p-4">
            {merchant.notes ? (
              <p className="text-sm whitespace-pre-wrap">{merchant.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No notes yet. Tap Edit to add notes about this merchant.
              </p>
            )}
          </Card>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Visit History</h2>
          {visitsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          ) : visits && visits.length > 0 ? (
            <div className="space-y-3">
              {visits.map((visit) => (
                <VisitCard key={visit.id} drop={visit} />
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No visit history for this merchant yet.
              </p>
            </Card>
          )}
        </section>
      </main>

      <div className="fixed bottom-16 left-0 right-0 bg-card border-t border-border p-4 z-40 safe-area-inset-bottom">
        <div className="container max-w-md mx-auto flex gap-3">
          <Button
            variant="outline"
            className="flex-1 min-h-touch gap-2"
            onClick={handleCall}
            disabled={!merchant.businessPhone}
            data-testid="button-call-merchant"
          >
            <Phone className="w-4 h-4" />
            Call
          </Button>
          <Button
            variant="outline"
            className="flex-1 min-h-touch gap-2"
            onClick={handleDirections}
            disabled={!merchant.address && !merchant.latitude}
            data-testid="button-get-directions"
          >
            <Navigation className="w-4 h-4" />
            Directions
          </Button>
        </div>
      </div>

      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notes</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editedNotes}
            onChange={(e) => setEditedNotes(e.target.value)}
            placeholder="Add notes about this merchant..."
            rows={6}
            data-testid="textarea-merchant-notes"
          />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNotesDialog(false)}
              className="min-h-touch"
              data-testid="button-cancel-notes"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNotes}
              disabled={updateMerchantMutation.isPending}
              className="min-h-touch gap-2"
              data-testid="button-save-notes"
            >
              {updateMerchantMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
