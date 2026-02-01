import { useState, useEffect } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, BellOff, Check, AlertTriangle, Smartphone, Settings, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NotificationPermissionPromptProps {
  onClose?: () => void;
  showAsDialog?: boolean;
  context?: string;
}

export function NotificationPermissionPrompt({ 
  onClose, 
  showAsDialog = false,
  context = "background tasks"
}: NotificationPermissionPromptProps) {
  const { isSupported, isSubscribed, permission, subscribe, isLoading } = usePushNotifications();
  const [showInstructions, setShowInstructions] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  const handleEnableNotifications = async () => {
    const success = await subscribe();
    if (success) {
      setSubscribeSuccess(true);
      setTimeout(() => {
        onClose?.();
      }, 2000);
    } else if (permission === "denied") {
      setShowInstructions(true);
    }
  };

  if (!isSupported) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Notifications Not Supported</AlertTitle>
        <AlertDescription>
          Your browser doesn't support push notifications. Try using Chrome, Safari, or Firefox for the best experience.
        </AlertDescription>
      </Alert>
    );
  }

  if (isSubscribed || subscribeSuccess) {
    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
        <Check className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800 dark:text-green-200">Notifications Enabled</AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          You'll receive notifications when your {context} complete.
        </AlertDescription>
      </Alert>
    );
  }

  const content = (
    <div className="space-y-4">
      {permission === "denied" || showInstructions ? (
        <div className="space-y-4">
          <Alert variant="destructive">
            <BellOff className="h-4 w-4" />
            <AlertTitle>Notifications Blocked</AlertTitle>
            <AlertDescription>
              You previously blocked notifications. Follow the steps below to enable them.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4" />
                How to Enable Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {isIOS && isSafari ? (
                <div className="space-y-2">
                  <p className="font-medium">On iOS Safari:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Tap the <strong>Share</strong> button (square with arrow)</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                    <li>Open the app from your Home Screen</li>
                    <li>When prompted, tap <strong>"Allow"</strong> for notifications</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2">
                    Note: iOS requires the app to be added to Home Screen for notifications to work.
                  </p>
                </div>
              ) : isAndroid ? (
                <div className="space-y-2">
                  <p className="font-medium">On Android:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Tap the <strong>lock icon</strong> in the address bar</li>
                    <li>Tap <strong>"Site settings"</strong> or <strong>"Permissions"</strong></li>
                    <li>Find <strong>"Notifications"</strong> and set to <strong>"Allow"</strong></li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-medium">On Desktop:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Click the <strong>lock/info icon</strong> in the address bar</li>
                    <li>Find <strong>"Notifications"</strong> in the permissions</li>
                    <li>Change to <strong>"Allow"</strong></li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.reload()} className="flex-1">
              Refresh Page
            </Button>
            {onClose && (
              <Button variant="ghost" onClick={onClose}>
                Maybe Later
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">Stay Updated</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Get notified when your {context} finish processing. No need to keep the app open!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              <Smartphone className="w-3 h-3 mr-1" />
              Works on mobile
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Bell className="w-3 h-3 mr-1" />
              Real-time alerts
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleEnableNotifications} 
              disabled={isLoading}
              className="flex-1"
              data-testid="button-enable-notifications"
            >
              {isLoading ? "Enabling..." : "Enable Notifications"}
            </Button>
            {onClose && (
              <Button variant="ghost" onClick={onClose} data-testid="button-skip-notifications">
                Not Now
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (showAsDialog) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose?.()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Enable Notifications
            </DialogTitle>
            <DialogDescription>
              Get alerts when your background tasks complete
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
}

export function useNotificationPrompt() {
  const { isSupported, isSubscribed, permission } = usePushNotifications();
  const [hasPrompted, setHasPrompted] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const prompted = localStorage.getItem("notification-prompt-shown");
    setHasPrompted(prompted === "true");
  }, []);

  const shouldShowPrompt = () => {
    if (!isSupported) return false;
    if (isSubscribed) return false;
    if (permission === "granted") return false;
    return true;
  };

  const triggerPrompt = () => {
    if (shouldShowPrompt()) {
      setShowPrompt(true);
      localStorage.setItem("notification-prompt-shown", "true");
    }
  };

  const closePrompt = () => {
    setShowPrompt(false);
  };

  return {
    showPrompt,
    triggerPrompt,
    closePrompt,
    shouldShowPrompt: shouldShowPrompt(),
    hasPromptedBefore: hasPrompted,
    isSubscribed
  };
}
