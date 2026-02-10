import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, MessageSquare } from "lucide-react";
import { formatPhone } from "@/lib/auto-communication";

interface CopyMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
  message: string;
}

export default function CopyMessageModal({
  open,
  onOpenChange,
  phone,
  message,
}: CopyMessageModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const onSuccess = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(message);
        onSuccess();
        return;
      } catch {}
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = message;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "0";
      ta.style.top = "0";
      ta.style.width = "1px";
      ta.style.height = "1px";
      ta.style.padding = "0";
      ta.style.border = "none";
      ta.style.outline = "none";
      ta.style.boxShadow = "none";
      ta.style.background = "transparent";
      ta.style.opacity = "0.01";
      ta.style.fontSize = "16px";
      document.body.appendChild(ta);
      ta.focus();
      ta.setSelectionRange(0, message.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) onSuccess();
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="modal-copy-message">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Text Message
          </DialogTitle>
          <DialogDescription>
            Copy this message and send it from your phone or a messaging app.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm">
            <span className="text-muted-foreground">To: </span>
            <span className="font-medium" data-testid="text-sms-recipient">
              {formatPhone(phone)}
            </span>
          </div>
          <div
            className="rounded-md border bg-muted/50 p-3 text-sm leading-relaxed whitespace-pre-wrap"
            data-testid="text-sms-body"
          >
            {message}
          </div>
        </div>
        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-copy"
          >
            Cancel
          </Button>
          <Button onClick={handleCopy} data-testid="button-copy-message">
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Message
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
