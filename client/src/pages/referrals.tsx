import { useState, useMemo, useEffect } from "react";
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
  DialogTrigger,
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
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Users,
  Phone,
  Building2,
  MessageSquare,
  ChevronDown,
  CheckCircle2,
  Clock,
  XCircle,
  UserCheck,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import type { Referral, DropWithBrochure, ReferralStatus } from "@shared/schema";
import { REFERRAL_STATUSES } from "@shared/schema";

const addReferralSchema = z.object({
  sourceDropId: z.string().optional(),
  referredBusinessName: z.string().min(1, "Business name is required"),
  referredContactName: z.string().optional(),
  referredPhone: z.string().optional(),
  notes: z.string().optional(),
});

type AddReferralFormData = z.infer<typeof addReferralSchema>;

const statusConfig: Record<ReferralStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800", icon: Clock },
  contacted: { label: "Contacted", color: "bg-blue-100 text-blue-800", icon: Phone },
  converted: { label: "Converted", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  lost: { label: "Lost", color: "bg-gray-100 text-gray-800", icon: XCircle },
};

function ReferralCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-4 w-full" />
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: ReferralStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <Badge variant="secondary" className={config.color}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function ReferralCard({ 
  referral, 
  drops,
  onStatusChange,
  onEdit,
  onDelete,
  isDeleting,
}: { 
  referral: Referral; 
  drops: DropWithBrochure[];
  onStatusChange: (id: number, status: ReferralStatus) => void;
  onEdit: (referral: Referral) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const sourceDrop = drops.find(d => d.id === referral.sourceDropId);
  
  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    await onStatusChange(referral.id, newStatus as ReferralStatus);
    setIsUpdating(false);
  };

  return (
    <Card className="p-4" data-testid={`card-referral-${referral.id}`}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{referral.referredBusinessName}</h3>
            {referral.referredContactName && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                {referral.referredContactName}
              </p>
            )}
            {referral.referredPhone && (
              <a 
                href={`tel:${referral.referredPhone}`}
                className="text-sm text-primary flex items-center gap-1 mt-1"
                data-testid={`link-phone-${referral.id}`}
              >
                <Phone className="w-3 h-3" />
                {referral.referredPhone}
              </a>
            )}
          </div>
          <StatusBadge status={referral.status as ReferralStatus} />
        </div>
        
        {sourceDrop && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            Referred by: {sourceDrop.businessName || "Unknown"}
          </p>
        )}
        
        {referral.notes && (
          <p className="text-sm text-muted-foreground flex items-start gap-1">
            <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{referral.notes}</span>
          </p>
        )}
        
        <div className="flex items-center justify-between pt-2 border-t border-border gap-2">
          <p className="text-xs text-muted-foreground">
            {format(new Date(referral.createdAt), "MMM d, yyyy")}
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(referral)}
              data-testid={`button-edit-${referral.id}`}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid={`button-delete-${referral.id}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Referral?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the referral for "{referral.referredBusinessName}". This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(referral.id)}
                    disabled={isDeleting}
                    data-testid="button-confirm-delete"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Select
              value={referral.status}
              onValueChange={handleStatusChange}
              disabled={isUpdating}
            >
              <SelectTrigger 
                className="w-[120px] min-h-touch text-xs"
                data-testid={`select-status-${referral.id}`}
              >
                {isUpdating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <SelectValue />
                    <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </SelectTrigger>
              <SelectContent>
                {REFERRAL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusConfig[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </Card>
  );
}

function EditReferralDialog({ 
  referral,
  drops,
  open,
  onOpenChange,
  onSuccess 
}: { 
  referral: Referral | null;
  drops: DropWithBrochure[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<AddReferralFormData>({
    resolver: zodResolver(addReferralSchema),
    defaultValues: {
      sourceDropId: "",
      referredBusinessName: "",
      referredContactName: "",
      referredPhone: "",
      notes: "",
    },
  });

  // Update form when dialog opens with a referral
  useEffect(() => {
    if (open && referral) {
      form.reset({
        sourceDropId: referral.sourceDropId?.toString() || "none",
        referredBusinessName: referral.referredBusinessName,
        referredContactName: referral.referredContactName || "",
        referredPhone: referral.referredPhone || "",
        notes: referral.notes || "",
      });
    }
  }, [open, referral, form]);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const updateMutation = useMutation({
    mutationFn: async (data: AddReferralFormData) => {
      if (!referral) throw new Error("No referral to update");
      const payload = {
        ...data,
        sourceDropId: data.sourceDropId && data.sourceDropId !== "none" ? parseInt(data.sourceDropId) : null,
      };
      const response = await apiRequest("PATCH", `/api/referrals/${referral.id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals"] });
      onOpenChange(false);
      onSuccess();
      toast({
        title: "Referral updated",
        description: "The referral has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update referral",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: AddReferralFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Referral</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sourceDropId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Drop (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="min-h-touch" data-testid="edit-select-source-drop">
                        <SelectValue placeholder="Select a drop..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No linked drop</SelectItem>
                      {drops.map((drop) => (
                        <SelectItem key={drop.id} value={drop.id.toString()}>
                          {drop.businessName || `Drop #${drop.id}`}
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
              name="referredBusinessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referred Business Name *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="min-h-touch" 
                      placeholder="Enter business name"
                      data-testid="edit-input-business-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="referredContactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="min-h-touch" 
                      placeholder="Enter contact name"
                      data-testid="edit-input-contact-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="referredPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="tel"
                      className="min-h-touch" 
                      placeholder="(555) 555-5555"
                      data-testid="edit-input-phone"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Any additional notes..."
                      className="resize-none"
                      rows={3}
                      data-testid="edit-textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full min-h-touch"
              disabled={updateMutation.isPending}
              data-testid="button-save-referral"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save Changes
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AddReferralDialog({ 
  drops,
  onSuccess 
}: { 
  drops: DropWithBrochure[];
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<AddReferralFormData>({
    resolver: zodResolver(addReferralSchema),
    defaultValues: {
      sourceDropId: "",
      referredBusinessName: "",
      referredContactName: "",
      referredPhone: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AddReferralFormData) => {
      const payload = {
        ...data,
        sourceDropId: data.sourceDropId && data.sourceDropId !== "none" ? parseInt(data.sourceDropId) : null,
      };
      const response = await apiRequest("POST", "/api/referrals", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals"] });
      form.reset();
      setOpen(false);
      onSuccess();
      toast({
        title: "Referral added",
        description: "The referral has been logged successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add referral",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: AddReferralFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="min-h-touch gap-2" data-testid="button-add-referral">
          <Plus className="w-4 h-4" />
          Add Referral
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Referral</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sourceDropId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Drop (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="min-h-touch" data-testid="select-source-drop">
                        <SelectValue placeholder="Select a drop..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No linked drop</SelectItem>
                      {drops.map((drop) => (
                        <SelectItem key={drop.id} value={drop.id.toString()}>
                          {drop.businessName || `Drop #${drop.id}`}
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
              name="referredBusinessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referred Business Name *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="min-h-touch" 
                      placeholder="Enter business name"
                      data-testid="input-business-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="referredContactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="min-h-touch" 
                      placeholder="Enter contact name"
                      data-testid="input-contact-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="referredPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="tel"
                      className="min-h-touch" 
                      placeholder="(555) 555-5555"
                      data-testid="input-phone"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Any additional notes..."
                      className="resize-none"
                      rows={3}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full min-h-touch"
              disabled={createMutation.isPending}
              data-testid="button-submit-referral"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Add Referral
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ReferralsPage() {
  const { toast } = useToast();
  const [editingReferral, setEditingReferral] = useState<Referral | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: referrals, isLoading: referralsLoading } = useQuery<Referral[]>({
    queryKey: ["/api/referrals"],
  });

  const { data: drops } = useQuery<DropWithBrochure[]>({
    queryKey: ["/api/drops"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: ReferralStatus }) => {
      const response = await apiRequest("PATCH", `/api/referrals/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals"] });
      toast({
        title: "Status updated",
        description: "Referral status has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update status",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/referrals/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals"] });
      toast({
        title: "Referral deleted",
        description: "The referral has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete referral",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (id: number, status: ReferralStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleEdit = (referral: Referral) => {
    setEditingReferral(referral);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const stats = useMemo(() => {
    if (!referrals) return { total: 0, pending: 0, converted: 0, contacted: 0 };
    return {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === "pending").length,
      converted: referrals.filter((r) => r.status === "converted").length,
      contacted: referrals.filter((r) => r.status === "contacted").length,
    };
  }, [referrals]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md mx-auto px-4 h-14 flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-semibold">Referrals</span>
        </div>
      </header>

      <main className="container max-w-md mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-3" data-testid="referral-stats">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold" data-testid="stat-total">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600" data-testid="stat-converted">
              {stats.converted}
            </p>
            <p className="text-xs text-muted-foreground">Converted</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-600" data-testid="stat-pending">
              {stats.pending}
            </p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </Card>
        </div>

        <div className="flex justify-end">
          <AddReferralDialog 
            drops={drops || []} 
            onSuccess={() => {}} 
          />
        </div>

        <div className="text-sm text-muted-foreground">
          {referrals?.length || 0} {(referrals?.length || 0) === 1 ? "referral" : "referrals"}
        </div>

        {referralsLoading ? (
          <div className="space-y-3">
            <ReferralCardSkeleton />
            <ReferralCardSkeleton />
            <ReferralCardSkeleton />
          </div>
        ) : referrals && referrals.length > 0 ? (
          <div className="space-y-3">
            {referrals.map((referral) => (
              <ReferralCard
                key={referral.id}
                referral={referral}
                drops={drops || []}
                onStatusChange={handleStatusChange}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No referrals yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Track referrals from merchants to grow your network
            </p>
            <AddReferralDialog 
              drops={drops || []} 
              onSuccess={() => {}} 
            />
          </div>
        )}
      </main>

      <EditReferralDialog
        referral={editingReferral}
        drops={drops || []}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={() => setEditingReferral(null)}
      />

      <BottomNav />
    </div>
  );
}
