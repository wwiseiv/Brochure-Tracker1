import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface InvitationDetails {
  organizationName: string;
  role: string;
  inviterName: string;
  inviterEmail: string;
}

export default function AcceptInvitePage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [accepted, setAccepted] = useState(false);

  const params = new URLSearchParams(search);
  const token = params.get("token");

  const { data: invitation, isLoading, error } = useQuery<InvitationDetails>({
    queryKey: ["/api/invitations/accept", token],
    queryFn: async () => {
      const res = await fetch(`/api/invitations/accept/${token}`);
      if (!res.ok) {
        throw new Error("Invitation not found");
      }
      return res.json();
    },
    enabled: !!token,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/invitations/accept/${token}`, {
        userId: user?.id,
      });
      return res.json();
    },
    onSuccess: () => {
      setAccepted(true);
      toast({
        title: "Welcome to the team!",
        description: `You've successfully joined ${invitation?.organizationName}.`,
      });
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to join",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleGoHome = () => {
    setLocation("/");
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <XCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h1 className="text-xl font-semibold mb-2" data-testid="text-error-title">
            Invalid Invitation Link
          </h1>
          <p className="text-muted-foreground mb-6" data-testid="text-error-message">
            This invitation link appears to be invalid or incomplete.
          </p>
          <Button onClick={handleGoHome} className="w-full" data-testid="button-go-home">
            Return Home
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
          <h1 className="text-xl font-semibold mb-2" data-testid="text-loading">
            Loading invitation...
          </h1>
          <p className="text-muted-foreground">
            Please wait while we verify your invitation.
          </p>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <XCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h1 className="text-xl font-semibold mb-2" data-testid="text-error-title">
            Invitation Not Found
          </h1>
          <p className="text-muted-foreground mb-6" data-testid="text-error-message">
            This invitation may have expired or already been used.
          </p>
          <Button onClick={handleGoHome} className="w-full" data-testid="button-go-home">
            Return Home
          </Button>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
          <h1 className="text-xl font-semibold mb-2" data-testid="text-success-title">
            Welcome to {invitation.organizationName}!
          </h1>
          <p className="text-muted-foreground" data-testid="text-success-message">
            Redirecting you to the dashboard...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold" data-testid="text-branding">
            BrochureDrop
          </h1>
          <p className="text-muted-foreground mt-1">Team Invitation</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Organization</span>
              <span className="font-semibold text-right" data-testid="text-org-name">
                {invitation.organizationName}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Role</span>
              <Badge variant="secondary" data-testid="badge-role">
                {invitation.role}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Invited by</span>
              <span className="text-sm text-right" data-testid="text-inviter">
                {invitation.inviterName}
              </span>
            </div>
          </div>
        </div>

        {user ? (
          <Button
            onClick={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending}
            className="w-full h-12"
            data-testid="button-join"
          >
            {acceptMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              `Join ${invitation.organizationName}`
            )}
          </Button>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground" data-testid="text-login-prompt">
              Please log in to accept this invitation
            </p>
            <Button onClick={handleLogin} className="w-full h-12" data-testid="button-login">
              Log In
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
