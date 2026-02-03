import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  Copy,
  Mail,
  FileText,
  FileType,
  Download,
  Loader2,
  Check,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdviceExportToolbarProps {
  content: string;
  title?: string;
  subtitle?: string;
  className?: string;
  variant?: "inline" | "dropdown";
}

interface UserProfile {
  email?: string;
  firstName?: string;
  lastName?: string;
}

export function AdviceExportToolbar({
  content,
  title = "Sales Advice",
  subtitle,
  className,
  variant = "inline",
}: AdviceExportToolbarProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingWord, setIsGeneratingWord] = useState(false);

  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/me"],
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "The advice has been copied and is ready to paste.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard. Please select and copy manually.",
        variant: "destructive",
      });
    }
  };

  const handleEmailClick = () => {
    if (userProfile?.email) {
      setEmailAddress(userProfile.email);
    }
    setIsEmailDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailAddress.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await fetch("/api/export/email-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: emailAddress,
          content,
          title,
          subtitle,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send email");
      }

      toast({
        title: "Email sent",
        description: `The advice has been sent to ${emailAddress}`,
      });
      setIsEmailDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Email failed",
        description: error.message || "Unable to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleExportPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const response = await fetch("/api/export/advice-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content,
          title,
          subtitle,
          format: "pdf",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF downloaded",
        description: "Your advice document has been downloaded.",
      });
    } catch (error: any) {
      toast({
        title: "PDF generation failed",
        description: error.message || "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportWord = async () => {
    setIsGeneratingWord(true);
    try {
      const response = await fetch("/api/export/advice-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content,
          title,
          subtitle,
          format: "docx",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate Word document");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().split("T")[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Word document downloaded",
        description: "Your advice document has been downloaded.",
      });
    } catch (error: any) {
      toast({
        title: "Document generation failed",
        description: error.message || "Unable to generate Word document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingWord(false);
    }
  };

  const isLoading = isGeneratingPdf || isGeneratingWord || isSendingEmail;

  if (variant === "dropdown") {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={isLoading}
              className={className}
              data-testid="button-export-dropdown"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MoreVertical className="w-4 h-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCopy} data-testid="menu-item-copy">
              {copied ? (
                <Check className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              Copy to Clipboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEmailClick} data-testid="menu-item-email">
              <Mail className="w-4 h-4 mr-2" />
              Email to Myself
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportPdf} disabled={isGeneratingPdf} data-testid="menu-item-pdf">
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Download as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportWord} disabled={isGeneratingWord} data-testid="menu-item-word">
              {isGeneratingWord ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileType className="w-4 h-4 mr-2" />
              )}
              Download as Word
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Advice to Yourself
              </DialogTitle>
              <DialogDescription>
                Send this advice to your email so you can reference it later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  data-testid="input-email-address"
                />
              </div>
              <Button
                onClick={handleSendEmail}
                disabled={isSendingEmail || !emailAddress.trim()}
                className="w-full"
                data-testid="button-send-email"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className={cn("flex items-center gap-1 flex-wrap", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          disabled={isLoading}
          className="h-8 px-2"
          data-testid="button-copy-advice"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          <span className="ml-1 text-xs">Copy</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleEmailClick}
          disabled={isLoading}
          className="h-8 px-2"
          data-testid="button-email-advice"
        >
          <Mail className="w-4 h-4" />
          <span className="ml-1 text-xs">Email</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleExportPdf}
          disabled={isGeneratingPdf}
          className="h-8 px-2"
          data-testid="button-pdf-advice"
        >
          {isGeneratingPdf ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          <span className="ml-1 text-xs">PDF</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleExportWord}
          disabled={isGeneratingWord}
          className="h-8 px-2"
          data-testid="button-word-advice"
        >
          {isGeneratingWord ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileType className="w-4 h-4" />
          )}
          <span className="ml-1 text-xs">Word</span>
        </Button>
      </div>

      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Advice to Yourself
            </DialogTitle>
            <DialogDescription>
              Send this advice to your email so you can reference it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email-inline">Email Address</Label>
              <Input
                id="email-inline"
                type="email"
                placeholder="your@email.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                data-testid="input-email-address-inline"
              />
            </div>
            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !emailAddress.trim()}
              className="w-full"
              data-testid="button-send-email-inline"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
