import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Plus,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  ChevronRight,
  Zap,
  Loader2,
  ListChecks,
  PlayCircle,
} from "lucide-react";
import type { FollowUpSequence, FollowUpStep, FollowUpActionType } from "@shared/schema";

interface SequenceWithSteps extends FollowUpSequence {
  steps?: FollowUpStep[];
}

interface UserRole {
  role: string;
  memberId: number;
  organization: {
    id: number;
    name: string;
  };
  managerId: number | null;
}

const createSequenceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
});

const addStepSchema = z.object({
  stepNumber: z.coerce.number().min(1, "Step number must be at least 1"),
  delayDays: z.coerce.number().min(0, "Delay must be 0 or more days"),
  actionType: z.enum(["email", "call_reminder", "sms"]),
  subject: z.string().optional(),
  content: z.string().optional(),
});

type CreateSequenceFormData = z.infer<typeof createSequenceSchema>;
type AddStepFormData = z.infer<typeof addStepSchema>;

const actionTypeConfig: Record<FollowUpActionType, { icon: typeof Mail; label: string; color: string }> = {
  email: { icon: Mail, label: "Email", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  call_reminder: { icon: Phone, label: "Call Reminder", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  sms: { icon: MessageSquare, label: "SMS", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
};

function SequenceCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
        <Skeleton className="w-5 h-5" />
      </div>
    </Card>
  );
}

function SequenceCard({ sequence, onClick }: { sequence: FollowUpSequence; onClick: () => void }) {
  return (
    <Card
      className="p-4 hover-elevate cursor-pointer"
      onClick={onClick}
      data-testid={`card-sequence-${sequence.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{sequence.name}</h3>
          {sequence.description && (
            <p className="text-sm text-muted-foreground truncate">{sequence.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant={sequence.isActive ? "default" : "secondary"}>
              {sequence.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-2" />
      </div>
    </Card>
  );
}

function StepCard({ step }: { step: FollowUpStep }) {
  const config = actionTypeConfig[step.actionType as FollowUpActionType] || actionTypeConfig.email;
  const Icon = config.icon;

  return (
    <Card className="p-4" data-testid={`card-step-${step.id}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">Step {step.stepNumber}</span>
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Day {step.delayDays}
            </Badge>
          </div>
          <Badge variant="secondary" className={config.color}>
            {config.label}
          </Badge>
          {step.subject && (
            <p className="text-sm font-medium mt-2 truncate">{step.subject}</p>
          )}
          {step.content && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{step.content}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function SequencesPage() {
  const { toast } = useToast();
  const [selectedSequence, setSelectedSequence] = useState<SequenceWithSteps | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddStepDialog, setShowAddStepDialog] = useState(false);

  const { data: userRole } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  const { data: sequences, isLoading: sequencesLoading } = useQuery<FollowUpSequence[]>({
    queryKey: ["/api/sequences"],
  });

  const { data: sequenceDetail, isLoading: detailLoading } = useQuery<SequenceWithSteps>({
    queryKey: ["/api/sequences", selectedSequence?.id],
    enabled: !!selectedSequence?.id,
  });

  const isAdmin = userRole?.role === "master_admin";

  const createForm = useForm<CreateSequenceFormData>({
    resolver: zodResolver(createSequenceSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const stepForm = useForm<AddStepFormData>({
    resolver: zodResolver(addStepSchema),
    defaultValues: {
      stepNumber: 1,
      delayDays: 1,
      actionType: "email",
      subject: "",
      content: "",
    },
  });

  const createSequenceMutation = useMutation({
    mutationFn: async (data: CreateSequenceFormData) => {
      const response = await apiRequest("POST", "/api/sequences", data);
      return response.json();
    },
    onSuccess: (newSequence) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      setShowCreateDialog(false);
      createForm.reset();
      toast({
        title: "Sequence created!",
        description: "Now add steps to your sequence.",
      });
      setSelectedSequence(newSequence);
    },
    onError: (error) => {
      toast({
        title: "Failed to create sequence",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const addStepMutation = useMutation({
    mutationFn: async (data: AddStepFormData) => {
      const response = await apiRequest("POST", `/api/sequences/${selectedSequence?.id}/steps`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences", selectedSequence?.id] });
      setShowAddStepDialog(false);
      stepForm.reset({
        stepNumber: (sequenceDetail?.steps?.length || 0) + 2,
        delayDays: 1,
        actionType: "email",
        subject: "",
        content: "",
      });
      toast({
        title: "Step added!",
        description: "The step has been added to the sequence.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add step",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleCreateSubmit = (data: CreateSequenceFormData) => {
    createSequenceMutation.mutate(data);
  };

  const handleAddStepSubmit = (data: AddStepFormData) => {
    addStepMutation.mutate(data);
  };

  const handleOpenAddStep = () => {
    stepForm.reset({
      stepNumber: (sequenceDetail?.steps?.length || 0) + 1,
      delayDays: sequenceDetail?.steps?.length ? 
        (sequenceDetail.steps[sequenceDetail.steps.length - 1].delayDays + 3) : 1,
      actionType: "email",
      subject: "",
      content: "",
    });
    setShowAddStepDialog(true);
  };

  if (selectedSequence) {
    const steps = sequenceDetail?.steps || [];

    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="container max-w-md mx-auto px-4 h-14 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedSequence(null)}
              data-testid="button-back-sequences"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-semibold truncate">{selectedSequence.name}</span>
          </div>
        </header>

        <main className="container max-w-md mx-auto px-4 py-4 space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={sequenceDetail?.isActive ? "default" : "secondary"}>
                {sequenceDetail?.isActive ? "Active" : "Inactive"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {steps.length} {steps.length === 1 ? "step" : "steps"}
              </span>
            </div>
            {sequenceDetail?.description && (
              <p className="text-muted-foreground">{sequenceDetail.description}</p>
            )}
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-primary" />
              Sequence Steps
            </h2>
            {isAdmin && (
              <Button
                size="sm"
                onClick={handleOpenAddStep}
                data-testid="button-add-step"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Step
              </Button>
            )}
          </div>

          {detailLoading ? (
            <div className="space-y-3">
              <SequenceCardSkeleton />
              <SequenceCardSkeleton />
            </div>
          ) : steps.length > 0 ? (
            <div className="space-y-3">
              {steps
                .sort((a, b) => a.stepNumber - b.stepNumber)
                .map((step) => (
                  <StepCard key={step.id} step={step} />
                ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <PlayCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No steps yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Add steps to define the follow-up sequence
              </p>
              {isAdmin && (
                <Button onClick={handleOpenAddStep} data-testid="button-add-first-step">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Step
                </Button>
              )}
            </div>
          )}
        </main>

        <Dialog open={showAddStepDialog} onOpenChange={setShowAddStepDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Step</DialogTitle>
              <DialogDescription>
                Add a new step to the sequence
              </DialogDescription>
            </DialogHeader>
            <Form {...stepForm}>
              <form onSubmit={stepForm.handleSubmit(handleAddStepSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={stepForm.control}
                    name="stepNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Step Number</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            data-testid="input-step-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={stepForm.control}
                    name="delayDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delay (Days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            {...field}
                            data-testid="input-delay-days"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={stepForm.control}
                  name="actionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Action Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-action-type">
                            <SelectValue placeholder="Select action type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="email">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              Email
                            </div>
                          </SelectItem>
                          <SelectItem value="call_reminder">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              Call Reminder
                            </div>
                          </SelectItem>
                          <SelectItem value="sms">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4" />
                              SMS
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={stepForm.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Email subject or reminder title"
                          {...field}
                          data-testid="input-step-subject"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={stepForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Message content or notes"
                          rows={4}
                          {...field}
                          data-testid="input-step-content"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddStepDialog(false)}
                    data-testid="button-cancel-add-step"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addStepMutation.isPending}
                    data-testid="button-submit-step"
                  >
                    {addStepMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Add Step
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const [, navigate] = useLocation();

  const handleBack = () => {
    if (window.history.length > 2) {
      window.history.back();
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <span className="font-semibold">Follow-up Sequences</span>
            </div>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              data-testid="button-create-sequence"
            >
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          )}
        </div>
      </header>

      <main className="container max-w-md mx-auto px-4 py-4 space-y-4">
        <div className="text-sm text-muted-foreground">
          {sequences?.length || 0} {(sequences?.length || 0) === 1 ? "sequence" : "sequences"}
        </div>

        {sequencesLoading ? (
          <div className="space-y-3">
            <SequenceCardSkeleton />
            <SequenceCardSkeleton />
            <SequenceCardSkeleton />
          </div>
        ) : sequences && sequences.length > 0 ? (
          <div className="space-y-3">
            {sequences.map((sequence) => (
              <SequenceCard
                key={sequence.id}
                sequence={sequence}
                onClick={() => setSelectedSequence(sequence)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sequences yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {isAdmin
                ? "Create your first automated follow-up sequence"
                : "No follow-up sequences have been created yet"}
            </p>
            {isAdmin && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                data-testid="button-create-first-sequence"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Sequence
              </Button>
            )}
          </div>
        )}
      </main>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Sequence</DialogTitle>
            <DialogDescription>
              Create a new automated follow-up sequence
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Restaurant Follow-up"
                        {...field}
                        data-testid="input-sequence-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe this sequence..."
                        rows={3}
                        {...field}
                        data-testid="input-sequence-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  data-testid="button-cancel-create-sequence"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createSequenceMutation.isPending}
                  data-testid="button-submit-sequence"
                >
                  {createSequenceMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Create
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
