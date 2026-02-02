import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import ScanPage from "@/pages/scan";
import NewDropPage from "@/pages/new-drop";
import DropDetailPage from "@/pages/drop-detail";
import HistoryPage from "@/pages/history";
import ProfilePage from "@/pages/profile";
import AdminDashboardPage from "@/pages/admin-dashboard";
import RMDashboardPage from "@/pages/rm-dashboard";
import TeamManagementPage from "@/pages/team-management";
import HelpPage from "@/pages/help";
import EmailDrafterPage from "@/pages/email-drafter";
import MerchantsPage from "@/pages/merchants";
import MerchantDetailPage from "@/pages/merchant-detail";
import InventoryPage from "@/pages/inventory";
import ReferralsPage from "@/pages/referrals";
import ActivityFeedPage from "@/pages/activity-feed";
import RoutePlannerPage from "@/pages/route-planner";
import SequencesPage from "@/pages/sequences";
import AcceptInvitePage from "@/pages/accept-invite";
import CoachPage from "@/pages/coach";
import EquipIQPage from "@/pages/equipiq";
import PresentationTrainingPage from "@/pages/presentation-training";
import ProposalGeneratorPage from "@/pages/proposal-generator";
import StatementAnalyzerPage from "@/pages/statement-analyzer";
import MyWorkPage from "@/pages/my-work";
import ProspectFinderPage from "@/pages/prospect-finder";
import ProspectPipelinePage from "@/pages/prospect-pipeline";
import TeamPipelinePage from "@/pages/team-pipeline";
import PipelineAnalyticsPage from "@/pages/pipeline-analytics";
import TodayPage from "@/pages/today";
import BusinessCardScannerPage from "@/pages/business-card-scanner";
import ESignDocumentLibraryPage from "@/pages/esign-document-library";
import ESignRequestDetailPage from "@/pages/esign-request-detail";
import CompleteProfilePage from "@/pages/complete-profile";
import MarketingMaterialsPage from "@/pages/marketing-materials";
import NotFound from "@/pages/not-found";
import AccessDenied from "@/pages/access-denied";
import { HelpChatbot } from "@/components/HelpChatbot";
import { PermissionProvider } from "@/contexts/PermissionContext";

import { useLocation } from "wouter";

interface UserRole {
  role: string;
  memberId: number;
  organization: {
    id: number;
    name: string;
  };
  managerId: number | null;
  profileComplete?: boolean;
}

function AdminRoute() {
  const { data: userRole, isLoading } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (userRole?.role !== "master_admin" && userRole?.role !== "relationship_manager") {
    return <AccessDenied feature="the Admin Dashboard" />;
  }

  return <AdminDashboardPage />;
}

function TeamManagementRoute() {
  const { data: userRole, isLoading } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (userRole?.role !== "master_admin") {
    return <AccessDenied feature="Team Management" />;
  }

  return <TeamManagementPage />;
}

function RMRoute() {
  const { data: userRole, isLoading } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (userRole?.role !== "relationship_manager") {
    return <AccessDenied feature="the Manager Dashboard" />;
  }

  return <RMDashboardPage />;
}

function AuthenticatedRouter() {
  return (
    <>
      <HelpChatbot />
      <Switch>
        <Route path="/" component={DashboardPage} />
      <Route path="/admin" component={AdminRoute} />
      <Route path="/admin/team" component={TeamManagementRoute} />
      <Route path="/manager" component={RMRoute} />
      <Route path="/scan" component={ScanPage} />
      <Route path="/drops/new" component={NewDropPage} />
      <Route path="/drops/:id" component={DropDetailPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/merchants" component={MerchantsPage} />
      <Route path="/merchants/:id" component={MerchantDetailPage} />
      <Route path="/referrals" component={ReferralsPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/activity" component={ActivityFeedPage} />
      <Route path="/route" component={RoutePlannerPage} />
      <Route path="/sequences" component={SequencesPage} />
      <Route path="/coach" component={CoachPage} />
      <Route path="/equipiq" component={EquipIQPage} />
      <Route path="/presentation-training" component={PresentationTrainingPage} />
      <Route path="/proposal-generator" component={ProposalGeneratorPage} />
      <Route path="/statement-analyzer" component={StatementAnalyzerPage} />
      <Route path="/my-work" component={MyWorkPage} />
      <Route path="/prospects/search" component={ProspectFinderPage} />
      <Route path="/prospects/pipeline" component={ProspectPipelinePage} />
      <Route path="/team-pipeline" component={TeamPipelinePage} />
      <Route path="/pipeline-analytics" component={PipelineAnalyticsPage} />
      <Route path="/today" component={TodayPage} />
      <Route path="/prospects/scan-card" component={BusinessCardScannerPage} />
      <Route path="/esign" component={ESignDocumentLibraryPage} />
      <Route path="/esign/:id" component={ESignRequestDetailPage} />
      <Route path="/complete-profile" component={CompleteProfilePage} />
      <Route path="/marketing" component={MarketingMaterialsPage} />
      <Route path="/help" component={HelpPage} />
      <Route path="/email" component={EmailDrafterPage} />
      <Route component={NotFound} />
      </Switch>
    </>
  );
}

function ProfileCompletionGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: userRole, isLoading } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  // Use effect for navigation to avoid render-time side effects
  const needsProfileCompletion = userRole && userRole.profileComplete === false && location !== "/complete-profile";
  
  React.useEffect(() => {
    if (needsProfileCompletion) {
      setLocation("/complete-profile");
    }
  }, [needsProfileCompletion, setLocation]);

  // Don't block while loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Return null while redirecting
  if (needsProfileCompletion) {
    return null;
  }

  return <>{children}</>;
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <PermissionProvider>
      <ProfileCompletionGuard>
        <AuthenticatedRouter />
      </ProfileCompletionGuard>
    </PermissionProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/accept-invite" component={AcceptInvitePage} />
          <Route path="/help" component={HelpPage} />
          <Route component={AppContent} />
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
