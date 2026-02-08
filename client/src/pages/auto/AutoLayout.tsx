import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard, Users, Car, FileText, ClipboardCheck,
  Calendar, Settings, LogOut, Menu, X, Wrench, ChevronDown,
  UserPlus, CreditCard, BarChart3, MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { path: "/auto/dashboard", label: "Dashboard", shortLabel: "Dash", icon: LayoutDashboard },
  { path: "/auto/customers", label: "Customers", shortLabel: "Cust", icon: Users },
  { path: "/auto/repair-orders", label: "Repair Orders", shortLabel: "ROs", icon: FileText },
  { path: "/auto/inspections", label: "Inspections", shortLabel: "Insp", icon: ClipboardCheck },
  { path: "/auto/schedule", label: "Schedule", shortLabel: "Sched", icon: Calendar },
  { path: "/auto/reports", label: "Reports", shortLabel: "Reports", icon: BarChart3 },
  { path: "/auto/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
];

const BOTTOM_TAB_ITEMS = [
  { path: "/auto/dashboard", label: "Home", icon: LayoutDashboard, testId: "bottomnav-home" },
  { path: "/auto/repair-orders", label: "ROs", icon: FileText, testId: "bottomnav-ros" },
  { path: "/auto/schedule", label: "Schedule", icon: Calendar, testId: "bottomnav-schedule" },
  { path: "/auto/customers", label: "Cust", icon: Users, testId: "bottomnav-cust" },
];

const MORE_SHEET_ITEMS = [
  { path: "/auto/inspections", label: "Inspections", icon: ClipboardCheck },
  { path: "/auto/reports", label: "Reports", icon: BarChart3 },
  { path: "/auto/settings", label: "Settings", icon: Settings },
];

export function AutoLayout({ children }: { children: React.ReactNode }) {
  const { user, shop, logout } = useAutoAuth();
  const [location] = useLocation();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const isOwnerOrManager = user?.role === "owner" || user?.role === "manager";

  return (
    <div className="flex flex-col h-screen bg-background" data-testid="auto-layout">
      {/* Phone top bar: slim logo + avatar */}
      <header className="sm:hidden sticky top-0 z-50 flex items-center justify-between gap-2 px-4 py-2 border-b bg-background">
        <Link href="/auto/dashboard">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
              <Wrench className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-sm" data-testid="text-brand-mobile">PCB Auto</span>
              {shop && <span className="text-xs text-muted-foreground ml-2">{shop.name}</span>}
            </div>
          </div>
        </Link>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
      </header>

      {/* Tablet + Desktop top bar */}
      <header className="hidden sm:flex sticky top-0 z-50 items-center justify-between gap-2 px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-3">
          <Link href="/auto/dashboard">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
                <Wrench className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <span className="font-bold text-sm" data-testid="text-brand">PCB Auto</span>
                {shop && <span className="text-xs text-muted-foreground ml-2">{shop.name}</span>}
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.startsWith(item.path);
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                  <span className="lg:hidden">{item.shortLabel}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-user-menu">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="hidden lg:inline text-sm">{user?.firstName}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace("_", " ")}</p>
            </div>
            <DropdownMenuSeparator />
            {isOwnerOrManager && (
              <Link href="/auto/staff">
                <DropdownMenuItem data-testid="menu-staff">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Staff Management
                </DropdownMenuItem>
              </Link>
            )}
            {isOwnerOrManager && (
              <Link href="/auto/integrations">
                <DropdownMenuItem data-testid="menu-integrations">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Integrations
                </DropdownMenuItem>
              </Link>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="flex-1 overflow-auto pb-16 sm:pb-0">
        {children}
      </main>

      {/* Phone bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 flex items-center justify-around border-t bg-background" style={{ minHeight: "48px" }}>
        {BOTTOM_TAB_ITEMS.map((item) => {
          const isActive = location.startsWith(item.path);
          return (
            <Link key={item.path} href={item.path}>
              <button
                className={`flex flex-col items-center justify-center gap-0.5 px-3 min-h-[48px] rounded-md text-xs ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
                data-testid={item.testId}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px]">{item.label}</span>
              </button>
            </Link>
          );
        })}
        <button
          className={`flex flex-col items-center justify-center gap-0.5 px-3 min-h-[48px] rounded-md text-xs ${
            moreSheetOpen ? "text-primary" : "text-muted-foreground"
          }`}
          onClick={() => setMoreSheetOpen(!moreSheetOpen)}
          data-testid="bottomnav-more"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px]">More</span>
        </button>
      </nav>

      {/* More bottom sheet backdrop */}
      {moreSheetOpen && (
        <div
          className="sm:hidden fixed inset-0 z-[55] bg-black/50"
          onClick={() => setMoreSheetOpen(false)}
        />
      )}

      {/* More bottom sheet */}
      <div
        className={`sm:hidden fixed bottom-0 inset-x-0 z-[60] bg-background rounded-t-xl border-t transition-transform duration-300 ease-in-out ${
          moreSheetOpen ? "translate-y-0" : "translate-y-full"
        }`}
        data-testid="bottom-sheet-more"
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="px-4 pb-6 space-y-1">
          {MORE_SHEET_ITEMS.map((item) => {
            const isActive = location.startsWith(item.path);
            const testId = item.label.toLowerCase().replace(/\s/g, "-");
            return (
              <Link key={item.path} href={item.path}>
                <button
                  className={`flex items-center gap-3 w-full px-3 py-3 rounded-md text-sm ${
                    isActive ? "text-primary bg-primary/10" : "text-foreground"
                  }`}
                  onClick={() => setMoreSheetOpen(false)}
                  data-testid={`more-${testId}`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </button>
              </Link>
            );
          })}
          {isOwnerOrManager && (
            <Link href="/auto/staff">
              <button
                className={`flex items-center gap-3 w-full px-3 py-3 rounded-md text-sm ${
                  location.startsWith("/auto/staff") ? "text-primary bg-primary/10" : "text-foreground"
                }`}
                onClick={() => setMoreSheetOpen(false)}
                data-testid="more-staff"
              >
                <UserPlus className="h-5 w-5" />
                Staff Management
              </button>
            </Link>
          )}
          <button
            className="flex items-center gap-3 w-full px-3 py-3 rounded-md text-sm text-destructive"
            onClick={() => {
              setMoreSheetOpen(false);
              logout();
            }}
            data-testid="more-logout"
          >
            <LogOut className="h-5 w-5" />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
