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
import NotFound from "@/pages/not-found";

interface UserRole {
  role: string;
  memberId: number;
  organization: {
    id: number;
    name: string;
  };
  managerId: number | null;
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

  if (userRole?.role !== "master_admin") {
    return <NotFound />;
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
    return <NotFound />;
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
    return <NotFound />;
  }

  return <RMDashboardPage />;
}

function AuthenticatedRouter() {
  return (
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
      <Route path="/help" component={HelpPage} />
      <Route path="/email" component={EmailDrafterPage} />
      <Route component={NotFound} />
    </Switch>
  );
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

  return <AuthenticatedRouter />;
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
