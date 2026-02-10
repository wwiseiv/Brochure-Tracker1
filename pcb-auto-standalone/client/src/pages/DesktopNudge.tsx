import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, X } from "lucide-react";

interface DesktopNudgeProps {
  message: string;
  dismissKey: string;
}

export function DesktopNudge({ message, dismissKey }: DesktopNudgeProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const wasDismissed = localStorage.getItem(`nudge_${dismissKey}`);
    if (!wasDismissed) setDismissed(false);
  }, [dismissKey]);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(`nudge_${dismissKey}`, "true");
    setDismissed(true);
  };

  return (
    <div className="sm:hidden bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2.5 mx-4 mb-3 flex items-center justify-between gap-2 text-sm text-blue-800 dark:text-blue-200" data-testid={`nudge-${dismissKey}`}>
      <div className="flex items-center gap-2 min-w-0">
        <Monitor className="h-4 w-4 shrink-0" />
        <span className="text-xs">{message}</span>
      </div>
      <Button variant="ghost" size="icon" className="shrink-0" onClick={handleDismiss} data-testid={`button-dismiss-nudge-${dismissKey}`}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
