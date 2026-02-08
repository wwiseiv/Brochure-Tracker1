import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard, Users, Car, FileText, ClipboardCheck,
  Calendar, Settings, LogOut, Menu, X, Wrench, ChevronDown,
  UserPlus, CreditCard, BarChart3,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { path: "/auto/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/auto/customers", label: "Customers", icon: Users },
  { path: "/auto/repair-orders", label: "Repair Orders", icon: FileText },
  { path: "/auto/inspections", label: "Inspections", icon: ClipboardCheck },
  { path: "/auto/schedule", label: "Schedule", icon: Calendar },
  { path: "/auto/reports", label: "Reports", icon: BarChart3 },
  { path: "/auto/settings", label: "Settings", icon: Settings },
];

export function AutoLayout({ children }: { children: React.ReactNode }) {
  const { user, shop, logout } = useAutoAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isOwnerOrManager = user?.role === "owner" || user?.role === "manager";

  return (
    <div className="flex flex-col h-screen bg-background" data-testid="auto-layout">
      <header className="sticky top-0 z-50 flex items-center justify-between gap-2 px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Link href="/auto/dashboard">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
                <Wrench className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-sm" data-testid="text-brand">PCB Auto</span>
                {shop && <span className="text-xs text-muted-foreground ml-2">{shop.name}</span>}
              </div>
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-1">
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
              <span className="hidden sm:inline text-sm">{user?.firstName}</span>
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

      {mobileMenuOpen && (
        <div className="md:hidden border-b bg-background p-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.startsWith(item.path);
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      )}

      <main className="flex-1 overflow-auto">
        {children}
      </main>

      <nav className="md:hidden sticky bottom-0 z-50 flex items-center justify-around border-t bg-background py-1">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = location.startsWith(item.path);
          return (
            <Link key={item.path} href={item.path}>
              <button
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md text-xs ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
                data-testid={`bottomnav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px]">{item.label.split(" ")[0]}</span>
              </button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
