import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageSquarePlus, Upload, X, FileText, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Attachment {
  objectPath: string;
  name: string;
  size: number;
  contentType: string;
}

interface FileUploadItem {
  id: string;
  file: File;
  status: "uploading" | "done" | "error";
  progress: number;
  attachment?: Attachment;
  previewUrl?: string;
  errorMessage?: string;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadFile(file: File): Promise<Attachment> {
  const isPdf = file.type === "application/pdf";
  const endpoint = isPdf ? "/api/uploads/documents" : "/api/uploads/proxy";

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Upload failed");
  }

  const data = await response.json();
  return {
    objectPath: data.objectPath,
    name: data.metadata.name,
    size: data.metadata.size,
    contentType: data.metadata.contentType,
  };
}

export function FeedbackButton() {
  const { data: userRole } = useQuery<{ role: string } | null>({
    queryKey: ["/api/me/role"],
    retry: false,
  });

  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const resetForm = useCallback(() => {
    setFeedbackType("");
    setSubject("");
    setMessage("");
    setFiles((prev) => {
      prev.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
      return [];
    });
  }, []);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const attachments = files
        .filter((f) => f.status === "done" && f.attachment)
        .map((f) => f.attachment!);

      await apiRequest("POST", "/api/feedback", {
        type: feedbackType,
        subject,
        message,
        attachments,
      });
    },
    onSuccess: () => {
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback. We will review it shortly.",
      });
      resetForm();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit feedback",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const currentCount = files.length;
      const remaining = MAX_FILES - currentCount;

      if (remaining <= 0) {
        toast({
          title: "File limit reached",
          description: `Maximum ${MAX_FILES} files allowed.`,
          variant: "destructive",
        });
        return;
      }

      const filesToAdd = fileArray.slice(0, remaining);

      filesToAdd.forEach((file) => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a supported file type.`,
            variant: "destructive",
          });
          return;
        }

        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds the 10MB limit.`,
            variant: "destructive",
          });
          return;
        }

        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const previewUrl = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined;

        const item: FileUploadItem = {
          id,
          file,
          status: "uploading",
          progress: 50,
          previewUrl,
        };

        setFiles((prev) => [...prev, item]);

        uploadFile(file)
          .then((attachment) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === id
                  ? { ...f, status: "done" as const, progress: 100, attachment }
                  : f
              )
            );
          })
          .catch((err) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === id
                  ? {
                      ...f,
                      status: "error" as const,
                      errorMessage: err.message,
                    }
                  : f
              )
            );
          });
      });
    },
    [files.length, toast]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  if (!userRole) return null;

  const hasUploading = files.some((f) => f.status === "uploading");
  const canSubmit =
    feedbackType && subject.trim() && message.trim() && !hasUploading;

  return (
    <>
      <button
        data-testid="button-feedback-fab"
        onClick={() => setOpen(true)}
        className="fixed z-50 bottom-24 right-4 md:bottom-6 md:right-6 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 animate-pulse ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="w-5 h-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={
            isMobile
              ? "max-h-[85vh] overflow-y-auto rounded-t-lg"
              : "w-full sm:max-w-md overflow-y-auto"
          }
        >
          <SheetHeader>
            <SheetTitle>Send Feedback</SheetTitle>
            <SheetDescription>
              Let us know how we can improve your experience.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 mt-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Type
              </label>
              <Select value={feedbackType} onValueChange={setFeedbackType}>
                <SelectTrigger data-testid="select-feedback-type">
                  <SelectValue placeholder="Select feedback type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature_suggestion">
                    Feature Suggestion
                  </SelectItem>
                  <SelectItem value="bug_report">Bug Report</SelectItem>
                  <SelectItem value="help_request">Help Request</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Subject
              </label>
              <Input
                data-testid="input-feedback-subject"
                placeholder="Brief summary"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Message
              </label>
              <Textarea
                data-testid="textarea-feedback-message"
                placeholder="Describe your feedback in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Attachments
              </label>
              <div
                data-testid="dropzone-feedback-files"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 cursor-pointer transition-colors ${
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover-elevate"
                }`}
              >
                <Upload className="w-6 h-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-muted-foreground">
                  Images or PDF, max 10MB each, up to {MAX_FILES} files
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept={ACCEPTED_TYPES.join(",")}
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {files.length > 0 && (
              <div className="flex flex-col gap-2">
                {files.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-md border p-2"
                  >
                    <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center">
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.file.name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(item.file.size)}
                        </span>
                        {item.status === "uploading" && (
                          <Badge variant="secondary" className="text-xs">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Uploading
                          </Badge>
                        )}
                        {item.status === "done" && (
                          <Badge variant="secondary" className="text-xs">
                            Uploaded
                          </Badge>
                        )}
                        {item.status === "error" && (
                          <Badge variant="destructive" className="text-xs">
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFile(item.id)}
                      aria-label={`Remove ${item.file.name}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button
              data-testid="button-submit-feedback"
              onClick={() => submitMutation.mutate()}
              disabled={!canSubmit || submitMutation.isPending}
              className="w-full"
            >
              {submitMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Submit Feedback
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
