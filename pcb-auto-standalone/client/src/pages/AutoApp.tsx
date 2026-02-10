import { Switch, Route, Redirect } from "wouter";
import { useAutoAuth, AutoAuthProvider } from "@/hooks/use-auto-auth";
import AutoLogin from "./AutoLogin";
import AutoRegister from "./AutoRegister";
import AutoDashboard from "./AutoDashboard";
import AutoCustomers from "./AutoCustomers";
import AutoCustomerForm from "./AutoCustomerForm";
import AutoCustomerDetail from "./AutoCustomerDetail";
import AutoRepairOrders from "./AutoRepairOrders";
import AutoRepairOrderForm from "./AutoRepairOrderForm";
import AutoInspections from "./AutoInspections";
import AutoSchedule from "./AutoSchedule";
import AutoSettings from "./AutoSettings";
import AutoStaff from "./AutoStaff";
import AutoPublicApproval from "./AutoPublicApproval";
import AutoPublicInspection from "./AutoPublicInspection";
import AutoReports from "./AutoReports";
import AutoInvoice from "./AutoInvoice";
import AutoQuickBooks from "./AutoQuickBooks";
import AutoPaymentProcessor from "./AutoPaymentProcessor";
import AutoForgotPassword from "./AutoForgotPassword";
import AutoResetPassword from "./AutoResetPassword";
import AutoShortApproval from "./AutoShortApproval";
import AutoBayConfig from "./AutoBayConfig";
import AutoStaffAvailability from "./AutoStaffAvailability";
import AutoDashboardVisibility from "./AutoDashboardVisibility";
import AutoTechPortal from "./AutoTechPortal";
import AutoReportsV2 from "./AutoReportsV2";
import AutoCampaignSettings from "./AutoCampaignSettings";
import AutoLocations from "./AutoLocations";
import { AutoAssistantProvider } from "@/components/auto/AutoAssistantProvider";
import { AutoAssistantChat } from "@/components/auto/AutoAssistantChat";
import { Loader2 } from "lucide-react";

function AutoAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAutoAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading PCB Auto...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AutoLogin />;
  }

  return <>{children}</>;
}

function AuthenticatedAutoRoutes() {
  return (
    <AutoAuthGuard>
      <AutoAssistantProvider>
        <Switch>
          <Route path="/dashboard" component={AutoDashboard} />
          <Route path="/customers/new" component={AutoCustomerForm} />
          <Route path="/customers/:id" component={AutoCustomerDetail} />
          <Route path="/customers" component={AutoCustomers} />
          <Route path="/invoice/:roId" component={AutoInvoice} />
          <Route path="/repair-orders/new" component={AutoRepairOrderForm} />
          <Route path="/repair-orders/:id" component={AutoRepairOrderForm} />
          <Route path="/repair-orders" component={AutoRepairOrders} />
          <Route path="/inspections" component={AutoInspections} />
          <Route path="/schedule" component={AutoSchedule} />
          <Route path="/reports-v2" component={AutoReportsV2} />
          <Route path="/reports" component={AutoReports} />
          <Route path="/tech-portal" component={AutoTechPortal} />
          <Route path="/settings/bays" component={AutoBayConfig} />
          <Route path="/settings/availability" component={AutoStaffAvailability} />
          <Route path="/settings/visibility" component={AutoDashboardVisibility} />
          <Route path="/settings/campaigns" component={AutoCampaignSettings} />
          <Route path="/settings/locations" component={AutoLocations} />
          <Route path="/settings" component={AutoSettings} />
          <Route path="/quickbooks" component={AutoQuickBooks} />
          <Route path="/processor" component={AutoPaymentProcessor} />
          <Route path="/staff" component={AutoStaff} />
          <Route>
            <Redirect to="/dashboard" />
          </Route>
        </Switch>
        <AutoAssistantChat />
      </AutoAssistantProvider>
    </AutoAuthGuard>
  );
}

export default function AutoApp() {
  return (
    <AutoAuthProvider>
      <Switch>
        <Route path="/login" component={AutoLogin} />
        <Route path="/register" component={AutoRegister} />
        <Route path="/forgot-password" component={AutoForgotPassword} />
        <Route path="/reset-password" component={AutoResetPassword} />
        <Route path="/a/:code" component={AutoShortApproval} />
        <Route path="/approve/:token" component={AutoPublicApproval} />
        <Route path="/inspect/:token" component={AutoPublicInspection} />
        <Route path="/public/*">
          {() => <div className="p-6 text-center">Public page - Coming soon</div>}
        </Route>
        <Route component={AuthenticatedAutoRoutes} />
      </Switch>
    </AutoAuthProvider>
  );
}
