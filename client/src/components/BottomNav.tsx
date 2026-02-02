import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Home, QrCode, User, Store, FileSignature, HelpCircle, CalendarCheck, Users, BarChart3, GraduationCap, Building2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface UserRole {
  role: string;
  memberId: number;
  organization: { id: number; name: string };
}

const navItems = [
  { path: "/", icon: Home, label: "Home", tooltip: "Go to home screen" },
  { path: "/today", icon: CalendarCheck, label: "Today", tooltip: "Today's tasks and actions" },
  { path: "/merchants", icon: Building2, label: "CRM", tooltip: "Merchant accounts & CRM" },
  { path: "/scan", icon: QrCode, label: "Scan", tooltip: "Scan & drop a brochure" },
  { path: "/esign", icon: FileSignature, label: "E-Sign", tooltip: "Electronic signature documents" },
  { path: "/coach", icon: GraduationCap, label: "Coach", tooltip: "AI coaching & training tools" },
  { path: "/profile", icon: User, label: "Profile", tooltip: "Your profile & settings" },
];

const managerNavItems = [
  { path: "/team-pipeline", icon: Users, label: "Team", tooltip: "Team pipeline & analytics" },
];

export function BottomNav() {
  const [location] = useLocation();
  const [mounted, setMounted] = useState(false);
  const { data: userRole } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const isManager = userRole?.role === "master_admin" || userRole?.role === "relationship_manager";

  const displayItems = isManager 
    ? [...navItems.slice(0, 5), ...managerNavItems, navItems[5]] 
    : navItems;

  const navContent = (
    <nav 
      className="bg-card border-t border-border"
      style={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 2147483647,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)'
      }}
      data-testid="bottom-nav"
    >
      <div className="flex items-center justify-around flex-wrap gap-1 h-16 max-w-lg mx-auto px-2">
        {displayItems.map((item) => {
          const isActive = location === item.path || 
            (item.path === "/team-pipeline" && location === "/pipeline-analytics") ||
            (item.path === "/pipeline-analytics" && location === "/team-pipeline");
          const Icon = item.icon;
          
          return (
            <Tooltip key={item.path} delayDuration={700}>
              <TooltipTrigger asChild>
                <Link href={item.path}>
                  <button
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] py-2 px-1 rounded-lg transition-colors ${
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover-elevate"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{item.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </nav>
  );

  // Use portal to render directly to body, bypassing any parent transforms
  if (mounted && typeof document !== 'undefined') {
    return createPortal(navContent, document.body);
  }

  return navContent;
}

export function FloatingHelpButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href="/help">
          <button
            data-testid="button-floating-help"
            className="fixed top-4 right-4 z-50 w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors shadow-sm"
            aria-label="Help"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>Help & Support</p>
      </TooltipContent>
    </Tooltip>
  );
}
