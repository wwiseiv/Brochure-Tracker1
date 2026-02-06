import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MessageSquare,
  Bug,
  Lightbulb,
  HelpCircle,
  Paperclip,
  FileText,
  Image,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  X,
  Loader2,
  Filter,
  StickyNote,
} from "lucide-react";
import { format } from "date-fns";

interface FeedbackItem {
  id: number;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  type: string;
  subject: string;
  message: string;
  status: string;
  attachments: Array<{ objectPath: string; name: string; size: number; contentType: string }> | null;
  adminNotes: string | null;
  createdAt: string;
}

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "feature_suggestion", label: "Feature Suggestion" },
  { value: "bug_report", label: "Bug Report" },
  { value: "help_request", label: "Help Request" },
] as const;

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

function getTypeIcon(type: string) {
  switch (type) {
    case "feature_suggestion":
      return <Lightbulb className="h-3.5 w-3.5" />;
    case "bug_report":
      return <Bug className="h-3.5 w-3.5" />;
    case "help_request":
      return <HelpCircle className="h-3.5 w-3.5" />;
    default:
      return <MessageSquare className="h-3.5 w-3.5" />;
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case "feature_suggestion":
      return "Feature Suggestion";
    case "bug_report":
      return "Bug Report";
    case "help_request":
      return "Help Request";
    default:
      return type;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "new":
      return "New";
    case "in_progress":
      return "In Progress";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

function TypeBadge({ type }: { type: string }) {
  let variant: "secondary" | "destructive" | "outline" = "secondary";
  
  if (type === "bug_report") {
    variant = "destructive";
  } else if (type === "help_request") {
    variant = "outline";
  } else {
    variant = "secondary";
  }

  return (
    <Badge variant={variant} data-testid={`badge-type-${type}`}>
      <span className="flex items-center gap-1">
        {getTypeIcon(type)}
        {getTypeLabel(type)}
      </span>
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  let variant: "outline" | "default" | "secondary" = "outline";
  
  if (status === "new") {
    variant = "outline";
  } else if (status === "in_progress") {
    variant = "default";
  } else if (status === "resolved") {
    variant = "secondary";
  } else if (status === "closed") {
    variant = "outline";
  }

  return (
    <Badge variant={variant} data-testid={`badge-status-${status}`}>
      {getStatusLabel(status)}
    </Badge>
  );
}

function isImageContentType(contentType: string) {
  return contentType.startsWith("image/");
}

function FeedbackCard({ item }: { item: FeedbackItem }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState(item.adminNotes || "");
  const [savingNotes, setSavingNotes] = useState(false);

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await apiRequest("PATCH", `/api/admin/feedback/${item.id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
      toast({ title: "Status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const notesMutation = useMutation({
    mutationFn: async (notes: string) => {
      await apiRequest("PATCH", `/api/admin/feedback/${item.id}`, { adminNotes: notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
      toast({ title: "Notes saved" });
      setSavingNotes(false);
    },
    onError: () => {
      toast({ title: "Failed to save notes", variant: "destructive" });
      setSavingNotes(false);
    },
  });

  const handleSaveNotes = () => {
    setSavingNotes(true);
    notesMutation.mutate(adminNotes);
  };

  const messageIsTruncated = item.message.length > 200;
  const displayMessage = expanded ? item.message : item.message.slice(0, 200);

  return (
    <Card className="p-4" data-testid={`card-feedback-${item.id}`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeBadge type={item.type} />
            <StatusBadge status={item.status} />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span data-testid={`text-date-${item.id}`}>
              {format(new Date(item.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>
        </div>

        <h3 className="font-semibold text-base" data-testid={`text-subject-${item.id}`}>
          {item.subject}
        </h3>

        <div className="text-sm text-muted-foreground">
          <p data-testid={`text-message-${item.id}`}>
            {displayMessage}
            {messageIsTruncated && !expanded && "..."}
          </p>
          {messageIsTruncated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              data-testid={`button-expand-${item.id}`}
              className="mt-1 p-0 h-auto"
            >
              {expanded ? (
                <span className="flex items-center gap-1">
                  <ChevronUp className="h-3.5 w-3.5" /> Show less
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <ChevronDown className="h-3.5 w-3.5" /> Show more
                </span>
              )}
            </Button>
          )}
        </div>

        {item.userName || item.userEmail ? (
          <div className="text-sm text-muted-foreground" data-testid={`text-user-${item.id}`}>
            {item.userName && <span className="font-medium text-foreground">{item.userName}</span>}
            {item.userName && item.userEmail && <span className="mx-1">-</span>}
            {item.userEmail && <span>{item.userEmail}</span>}
          </div>
        ) : null}

        {item.attachments && item.attachments.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" />
              <span>{item.attachments.length} attachment{item.attachments.length > 1 ? "s" : ""}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.attachments.map((att, idx) => (
                <a
                  key={idx}
                  href={att.objectPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  data-testid={`link-attachment-${item.id}-${idx}`}
                >
                  {isImageContentType(att.contentType) ? (
                    <div className="relative w-16 h-16 rounded-md overflow-hidden border">
                      <img
                        src={att.objectPath}
                        alt={att.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <Card className="flex items-center gap-2 p-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs truncate max-w-[120px]">{att.name}</span>
                    </Card>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select
              value={item.status}
              onValueChange={(val) => statusMutation.mutate(val)}
              disabled={statusMutation.isPending}
              data-testid={`select-status-${item.id}`}
            >
              <SelectTrigger className="w-[140px]" data-testid={`select-trigger-status-${item.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            {statusMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNotesOpen(!notesOpen)}
            data-testid={`button-notes-toggle-${item.id}`}
          >
            <StickyNote className="h-4 w-4 mr-1" />
            {item.adminNotes ? "Edit Notes" : "Add Notes"}
          </Button>
        </div>

        {notesOpen && (
          <div className="flex flex-col gap-2 pt-2">
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add admin notes..."
              rows={3}
              data-testid={`textarea-admin-notes-${item.id}`}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNotesOpen(false)}
                data-testid={`button-notes-cancel-${item.id}`}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveNotes}
                disabled={savingNotes}
                data-testid={`button-save-notes-${item.id}`}
              >
                {savingNotes ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Save Notes
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function AdminFeedbackPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: feedback, isLoading } = useQuery<FeedbackItem[]>({
    queryKey: ["/api/admin/feedback", { type: typeFilter, status: statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/feedback?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch feedback");
      return res.json();
    },
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Feedback &amp; Issues</h1>
        <p className="text-muted-foreground mt-1" data-testid="text-page-description">
          Review user feedback, bug reports, and feature requests
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {feedback && (
              <Badge variant="secondary" data-testid="badge-total-count">
                {feedback.length} item{feedback.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Type:</span>
              <div className="flex gap-1 flex-wrap">
                {TYPE_FILTERS.map((tf) => (
                  <Button
                    key={tf.value}
                    variant={typeFilter === tf.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilter(tf.value)}
                    data-testid={`button-filter-type-${tf.value}`}
                    className="toggle-elevate"
                  >
                    {tf.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Status:</span>
              <div className="flex gap-1 flex-wrap">
                {STATUS_FILTERS.map((sf) => (
                  <Button
                    key={sf.value}
                    variant={statusFilter === sf.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(sf.value)}
                    data-testid={`button-filter-status-${sf.value}`}
                    className="toggle-elevate"
                  >
                    {sf.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex flex-col gap-4" data-testid="loading-skeleton">
          {[1, 2, 3].map((i) => (
            <Card className="p-4" key={i}>
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-4 w-48" />
              </div>
            </Card>
          ))}
        </div>
      ) : feedback && feedback.length > 0 ? (
        <div className="flex flex-col gap-4">
          {feedback.map((item) => (
            <FeedbackCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center" data-testid="empty-state">
          <div className="flex flex-col items-center gap-3">
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
            <h3 className="font-medium text-lg">No feedback found</h3>
            <p className="text-muted-foreground text-sm">
              {typeFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters to see more results."
                : "No feedback submissions have been received yet."}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
