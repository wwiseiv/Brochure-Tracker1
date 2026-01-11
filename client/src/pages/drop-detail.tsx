import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { StatusBadge } from "@/components/StatusBadge";
import { BusinessTypeIcon, businessTypeLabels } from "@/components/BusinessTypeIcon";
import { DropDetailSkeleton } from "@/components/LoadingState";
import { BottomNav } from "@/components/BottomNav";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Calendar,
  Clock,
  FileText,
  Mic,
  ExternalLink,
  CheckCircle2,
  XCircle,
  CalendarPlus,
  RefreshCw,
  AlertCircle,
  Building2,
  User,
  Pencil,
  Loader2,
} from "lucide-react";
import { format, formatDistanceToNow, addDays } from "date-fns";
import type { DropWithBrochure, BusinessType, OutcomeType } from "@shared/schema";
import { BUSINESS_TYPES } from "@shared/schema";

const editDropSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessType: z.string().min(1, "Business type is required"),
  contactName: z.string().optional(),
  businessPhone: z.string().optional(),
  address: z.string().optional(),
  textNotes: z.string().optional(),
  followUpDays: z.string(),
});

type EditDropFormData = z.infer<typeof editDropSchema>;

const outcomeOptions: { value: OutcomeType; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { value: "signed", label: "Signed - Converted!", icon: CheckCircle2, color: "text-emerald-600" },
  { value: "interested_appointment", label: "Interested - Set Appointment", icon: CalendarPlus, color: "text-blue-600" },
  { value: "interested_later", label: "Interested - Follow Up Later", icon: RefreshCw, color: "text-amber-600" },
  { value: "not_interested", label: "Not Interested", icon: XCircle, color: "text-gray-600" },
  { value: "closed", label: "Business Closed", icon: AlertCircle, color: "text-red-600" },
  { value: "not_found", label: "Couldn't Find Brochure", icon: AlertCircle, color: "text-gray-600" },
];

export default function DropDetailPage() {
  const [, params] = useRoute("/drops/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [showOutcomeDialog, setShowOutcomeDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeType | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState("");

  const dropId = params?.id;

  const { data: drop, isLoading } = useQuery<DropWithBrochure>({
    queryKey: ["/api/drops", dropId],
    enabled: !!dropId,
  });

  const form = useForm<EditDropFormData>({
    resolver: zodResolver(editDropSchema),
    defaultValues: {
      businessName: "",
      businessType: "",
      contactName: "",
      businessPhone: "",
      address: "",
      textNotes: "",
      followUpDays: "0",
    },
  });

  useEffect(() => {
    if (drop && showEditDialog) {
      const daysUntilPickup = drop.pickupScheduledFor 
        ? Math.max(0, Math.ceil((new Date(drop.pickupScheduledFor).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      
      form.reset({
        businessName: drop.businessName || "",
        businessType: drop.businessType || "",
        contactName: drop.contactName || "",
        businessPhone: drop.businessPhone || "",
        address: drop.address || "",
        textNotes: drop.textNotes || "",
        followUpDays: daysUntilPickup.toString(),
      });
    }
  }, [drop, showEditDialog, form]);

  const editDropMutation = useMutation({
    mutationFn: async (data: EditDropFormData) => {
      const followUpDays = parseInt(data.followUpDays);
      const pickupScheduledFor = followUpDays > 0 
        ? addDays(new Date(), followUpDays).toISOString() 
        : null;
      
      const response = await apiRequest("PATCH", `/api/drops/${dropId}`, {
        businessName: data.businessName,
        businessType: data.businessType,
        contactName: data.contactName || null,
        businessPhone: data.businessPhone || null,
        address: data.address || null,
        textNotes: data.textNotes || null,
        pickupScheduledFor,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drops"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drops", dropId] });
      setShowEditDialog(false);
      toast({
        title: "Drop updated!",
        description: "Your changes have been saved.",
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

  const handleEditSubmit = (data: EditDropFormData) => {
    editDropMutation.mutate(data);
  };

  const updateDropMutation = useMutation({
    mutationFn: async (data: { status: string; outcome?: string; outcomeNotes?: string }) => {
      const response = await apiRequest("PATCH", `/api/drops/${dropId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drops"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drops", dropId] });
      setShowOutcomeDialog(false);
      toast({
        title: "Pickup logged!",
        description: "Drop status has been updated.",
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

  const handleLogOutcome = () => {
    if (!selectedOutcome) return;
    
    const finalStatus = selectedOutcome === "signed" ? "converted" : "picked_up";
    
    updateDropMutation.mutate({
      status: finalStatus,
      outcome: selectedOutcome,
      outcomeNotes,
    });
  };

  const openInMaps = () => {
    if (!drop?.latitude || !drop?.longitude) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${drop.latitude},${drop.longitude}`;
    window.open(url, "_blank");
  };

  const callBusiness = () => {
    if (!drop?.businessPhone) return;
    window.location.href = `tel:${drop.businessPhone}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="container max-w-md mx-auto px-4 h-14 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-semibold">Drop Details</span>
          </div>
        </header>
        <main className="container max-w-md mx-auto">
          <DropDetailSkeleton />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!drop) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="container max-w-md mx-auto px-4 h-14 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-semibold">Drop Not Found</span>
          </div>
        </header>
        <main className="container max-w-md mx-auto px-4 py-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Drop not found</h2>
          <p className="text-muted-foreground mb-6">This drop may have been deleted or doesn't exist.</p>
          <Button className="min-h-touch" onClick={() => navigate("/")} data-testid="button-go-to-dashboard">Go to Dashboard</Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-semibold">Drop Details</span>
          </div>
          {drop.status === "pending" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEditDialog(true)}
              data-testid="button-edit"
            >
              <Pencil className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      <main className="container max-w-md mx-auto px-4 py-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BusinessTypeIcon 
              type={(drop.businessType as BusinessType) || "other"} 
              className="w-6 h-6 text-primary"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-xl font-bold" data-testid="text-business-name">
                {drop.businessName || "Unknown Business"}
              </h1>
              <StatusBadge status={drop.status as any} outcome={drop.outcome as any} />
            </div>
            <p className="text-sm text-muted-foreground">
              {businessTypeLabels[(drop.businessType as BusinessType) || "other"]}
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          {drop.address && (
            <Card className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate" data-testid="text-address">{drop.address}</span>
              </div>
              {drop.latitude && drop.longitude && (
                <Button 
                  variant="ghost" 
                  onClick={openInMaps}
                  className="flex-shrink-0 min-h-touch gap-1"
                  data-testid="button-open-maps"
                >
                  <ExternalLink className="w-4 h-4" />
                  Maps
                </Button>
              )}
            </Card>
          )}

          {drop.businessPhone && (
            <Card className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm" data-testid="text-phone">{drop.businessPhone}</span>
              </div>
              <Button 
                variant="ghost" 
                onClick={callBusiness}
                className="min-h-touch gap-1"
                data-testid="button-call"
              >
                <Phone className="w-4 h-4" />
                Call
              </Button>
            </Card>
          )}

          {drop.contactName && (
            <Card className="p-3 flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm" data-testid="text-contact">{drop.contactName}</span>
            </Card>
          )}
        </div>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Brochure Info
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Brochure ID</p>
              <p className="font-mono font-medium" data-testid="text-brochure-id">{drop.brochureId}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Dropped</p>
              <p className="font-medium">{format(new Date(drop.droppedAt), "MMM d, h:mm a")}</p>
            </div>
            {drop.pickupScheduledFor && (
              <div>
                <p className="text-muted-foreground">Pickup Due</p>
                <p className="font-medium">{format(new Date(drop.pickupScheduledFor), "MMM d, yyyy")}</p>
              </div>
            )}
            {drop.pickedUpAt && (
              <div>
                <p className="text-muted-foreground">Picked Up</p>
                <p className="font-medium">{format(new Date(drop.pickedUpAt), "MMM d, h:mm a")}</p>
              </div>
            )}
          </div>
        </Card>

        {drop.voiceNoteUrl && (
          <Card className="p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Mic className="w-4 h-4" />
              Voice Note
            </h3>
            <VoiceRecorder
              existingAudioUrl={drop.voiceNoteUrl}
              onRecordingComplete={() => {}}
            />
            {drop.voiceTranscript && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Transcript</p>
                <p className="text-sm">{drop.voiceTranscript}</p>
              </div>
            )}
          </Card>
        )}

        {drop.textNotes && (
          <Card className="p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4" />
              Notes
            </h3>
            <p className="text-sm text-muted-foreground" data-testid="text-notes">
              {drop.textNotes}
            </p>
          </Card>
        )}

        {drop.outcomeNotes && (
          <Card className="p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4" />
              Outcome Notes
            </h3>
            <p className="text-sm text-muted-foreground">{drop.outcomeNotes}</p>
          </Card>
        )}
      </main>

      {drop.status === "pending" && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
          <div className="container max-w-md mx-auto">
            <Button
              className="w-full min-h-touch-lg text-lg font-semibold"
              onClick={() => setShowOutcomeDialog(true)}
              data-testid="button-log-outcome"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Log Pickup Outcome
            </Button>
          </div>
        </div>
      )}

      <Dialog open={showOutcomeDialog} onOpenChange={setShowOutcomeDialog}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Log Pickup Outcome</DialogTitle>
            <DialogDescription>
              What happened when you followed up on this brochure?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {outcomeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedOutcome === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedOutcome(option.value)}
                  className={`w-full min-h-touch p-3 rounded-lg border-2 flex items-center gap-3 transition-colors ${
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  data-testid={`outcome-${option.value}`}
                >
                  <Icon className={`w-5 h-5 ${option.color}`} />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              placeholder="Any additional notes about this pickup..."
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              className="resize-none"
              data-testid="textarea-outcome-notes"
            />
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 min-h-touch"
              onClick={() => setShowOutcomeDialog(false)}
              data-testid="button-cancel-outcome"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 min-h-touch"
              onClick={handleLogOutcome}
              disabled={!selectedOutcome || updateDropMutation.isPending}
              data-testid="button-confirm-outcome"
            >
              {updateDropMutation.isPending ? "Saving..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Drop</DialogTitle>
            <DialogDescription>
              Update the details for this drop.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Business Name
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter business name" 
                        className="min-h-touch"
                        {...field} 
                        data-testid="input-edit-business-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="min-h-touch" data-testid="select-edit-business-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BUSINESS_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {businessTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Contact Name
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Person you spoke with" 
                        className="min-h-touch"
                        {...field} 
                        data-testid="input-edit-contact-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Business Phone
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="tel"
                        placeholder="(555) 123-4567" 
                        className="min-h-touch"
                        {...field} 
                        data-testid="input-edit-business-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Address
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Business address" 
                        className="min-h-touch"
                        {...field} 
                        data-testid="input-edit-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="textNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Notes
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any notes about this drop..."
                        className="min-h-[100px] resize-none"
                        {...field} 
                        data-testid="textarea-edit-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="followUpDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Reschedule Follow-up
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="min-h-touch" data-testid="select-edit-follow-up">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Keep current date</SelectItem>
                        <SelectItem value="1">1 day from now</SelectItem>
                        <SelectItem value="2">2 days from now</SelectItem>
                        <SelectItem value="3">3 days from now</SelectItem>
                        <SelectItem value="5">5 days from now</SelectItem>
                        <SelectItem value="7">1 week from now</SelectItem>
                        <SelectItem value="14">2 weeks from now</SelectItem>
                      </SelectContent>
                    </Select>
                    {parseInt(form.watch("followUpDays") || "0") > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        New pickup date:{" "}
                        <span className="font-medium text-foreground">
                          {format(
                            addDays(new Date(), parseInt(form.watch("followUpDays") || "0")),
                            "EEEE, MMM d"
                          )}
                        </span>
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 min-h-touch"
                  onClick={() => setShowEditDialog(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 min-h-touch"
                  disabled={editDropMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {editDropMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
