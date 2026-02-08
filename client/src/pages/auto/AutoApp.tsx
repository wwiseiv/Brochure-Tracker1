import { Switch, Route, Redirect } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";
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
      <Switch>
        <Route path="/auto/dashboard" component={AutoDashboard} />
        <Route path="/auto/customers/new" component={AutoCustomerForm} />
        <Route path="/auto/customers/:id" component={AutoCustomerDetail} />
        <Route path="/auto/customers" component={AutoCustomers} />
        <Route path="/auto/invoice/:roId" component={AutoInvoice} />
        <Route path="/auto/repair-orders/new" component={AutoRepairOrderForm} />
        <Route path="/auto/repair-orders/:id" component={AutoRepairOrderForm} />
        <Route path="/auto/repair-orders" component={AutoRepairOrders} />
        <Route path="/auto/inspections" component={AutoInspections} />
        <Route path="/auto/schedule" component={AutoSchedule} />
        <Route path="/auto/reports" component={AutoReports} />
        <Route path="/auto/settings" component={AutoSettings} />
        <Route path="/auto/quickbooks" component={AutoQuickBooks} />
        <Route path="/auto/staff" component={AutoStaff} />
        <Route>
          <Redirect to="/auto/dashboard" />
        </Route>
      </Switch>
    </AutoAuthGuard>
  );
}

export default function AutoApp() {
  return (
    <Switch>
      <Route path="/auto/login" component={AutoLogin} />
      <Route path="/auto/register" component={AutoRegister} />
      <Route path="/auto/approve/:token" component={AutoPublicApproval} />
      <Route path="/auto/inspect/:token" component={AutoPublicInspection} />
      <Route path="/auto/public/*">
        {() => <div className="p-6 text-center">Public page - Coming soon</div>}
      </Route>
      <Route component={AuthenticatedAutoRoutes} />
    </Switch>
  );
}
