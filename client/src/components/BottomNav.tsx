import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  Home, QrCode, User, FileSignature, HelpCircle, CalendarCheck, Users, 
  GraduationCap, Building2, Menu, X, Briefcase, MapPin, FileText, 
  BarChart3, MessageSquare, Settings, Users2, Sparkles, Package,
  Target, Megaphone, History, PenTool, Shield, ChevronRight, Trophy, MessageSquarePlus,
  PlayCircle, BookOpen, Swords, Flame
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePermissions } from "@/contexts/PermissionContext";

interface UserRole {
  role: string;
  memberId: number;
  organization: { id: number; name: string };
}

const pathToFeatureMap: Record<string, string> = {
  "/": "dashboard",
  "/today": "today_dashboard",
  "/merchants": "merchant_profiles",
  "/prospects/pipeline": "deal_pipeline",
  "/scan": "drop_management",
  "/esign": "esign_integration",
  "/coach": "sales_spark",
  "/profile": "user_profile",
  "/team-pipeline": "team_reports",
  "/pipeline-analytics": "pipeline_analytics",
  "/admin": "admin_dashboard",
  "/admin/team": "team_management",
  "/prospects/search": "ai_prospect_finder",
  "/route": "route_planner",
  "/proposal-generator": "proposal_generator",
  "/statement-analyzer": "statement_analyzer",
  "/marketing": "marketing_materials",
  "/email": "email_drafter",
  "/equipiq": "equipiq",
  "/history": "drop_management",
  "/referrals": "referral_tracking",
  "/my-work": "my_analytics",
  "/activity": "activity_feed",
  "/help": "help_center",
  "/gamification": "gamification_dashboard",
  "/training/sales-videos": "video_hello",
  "/presentation-training": "presentation_training",
  "/interactive-training": "interactive_training",
};

// Bottom nav items - most used features
const navItems = [
  { path: "/", icon: Home, label: "Home", tooltip: "Go to home screen" },
  { path: "/today", icon: CalendarCheck, label: "Today", tooltip: "Today's tasks and actions" },
  { path: "/merchants", icon: Building2, label: "CRM", tooltip: "Merchant accounts & CRM" },
  { path: "/prospects/pipeline", icon: Target, label: "Pipeline", tooltip: "Prospect & deal pipeline" },
  { path: "/scan", icon: QrCode, label: "Scan", tooltip: "Scan & drop a brochure" },
  { path: "/esign", icon: FileSignature, label: "E-Sign", tooltip: "Electronic signature documents" },
  { path: "/coach", icon: GraduationCap, label: "Coach", tooltip: "AI coaching & training tools" },
  { path: "/profile", icon: User, label: "Profile", tooltip: "Your profile & settings" },
];

const managerNavItems = [
  { path: "/team-pipeline", icon: Users, label: "Team", tooltip: "Team pipeline & analytics" },
];

// Full menu items organized by category
const menuCategories = [
  {
    title: "Main",
    items: [
      { path: "/", icon: Home, label: "Home" },
      { path: "/today", icon: CalendarCheck, label: "Today" },
      { path: "/merchants", icon: Building2, label: "CRM / Merchants" },
      { path: "/prospects/pipeline", icon: Target, label: "Pipeline" },
    ]
  },
  {
    title: "Prospecting",
    items: [
      { path: "/prospects/search", icon: Sparkles, label: "AI Prospect Finder" },
      { path: "/route", icon: MapPin, label: "Route Planner" },
    ]
  },
  {
    title: "Documents",
    items: [
      { path: "/scan", icon: QrCode, label: "Scan Brochure" },
      { path: "/esign", icon: FileSignature, label: "E-Sign" },
      { path: "/proposal-generator", icon: FileText, label: "Proposal Generator" },
      { path: "/statement-analyzer", icon: BarChart3, label: "Statement Analyzer" },
      { path: "/marketing", icon: Megaphone, label: "Marketing Materials" },
    ]
  },
  {
    title: "AI Tools & Training",
    items: [
      { path: "/coach", icon: GraduationCap, label: "AI Coach & Training" },
      { path: "/interactive-training", icon: Swords, label: "Interactive Training" },
      { path: "/presentation-training", icon: BookOpen, label: "Presentation Training" },
      { path: "/training/sales-videos", icon: PlayCircle, label: "Sales Videos" },
      { path: "/email", icon: MessageSquare, label: "Email Drafter" },
      { path: "/equipiq", icon: Package, label: "EquipIQ" },
      { path: "/gamification", icon: Trophy, label: "Gamification" },
    ]
  },
  {
    title: "Activity",
    items: [
      { path: "/history", icon: History, label: "Drop History" },
      { path: "/referrals", icon: Users2, label: "Referrals" },
      { path: "/my-work", icon: Briefcase, label: "My Work" },
      { path: "/activity", icon: PenTool, label: "Activity Feed" },
    ]
  },
  {
    title: "Settings",
    items: [
      { path: "/profile", icon: User, label: "Profile & Settings" },
      { path: "/help", icon: HelpCircle, label: "Help & Support" },
    ]
  },
];

const managerMenuItems = [
  {
    title: "Team Management",
    items: [
      { path: "/team-pipeline", icon: Users, label: "Team Pipeline" },
      { path: "/pipeline-analytics", icon: BarChart3, label: "Pipeline Analytics" },
      { path: "/admin/team", icon: Users2, label: "Team Management" },
    ]
  },
];

const adminMenuItems = [
  {
    title: "Admin",
    items: [
      { path: "/admin", icon: Shield, label: "Admin Dashboard" },
      { path: "/admin/feedback", icon: MessageSquarePlus, label: "Feedback & Issues" },
    ]
  },
];

export function BottomNav() {
  const [location] = useLocation();
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: userRole } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });
  const { hasFeature, hasRole, isLoading: permLoading } = usePermissions();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const isManager = userRole?.role === "master_admin" || userRole?.role === "relationship_manager";
  
  const canAccessPath = (path: string): boolean => {
    if (permLoading) return true;
    const featureId = pathToFeatureMap[path];
    if (!featureId) return true;
    return hasFeature(featureId);
  };

  const allItems = isManager 
    ? [...navItems.slice(0, 6), ...managerNavItems, ...navItems.slice(6)] 
    : navItems;
  
  const displayItems = allItems.filter(item => canAccessPath(item.path));

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
      <div 
        ref={scrollRef}
        className="flex items-center justify-center h-16 overflow-x-auto scrollbar-hide"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x mandatory',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        <div className="flex items-center justify-center gap-1 px-2 min-w-max">
          {displayItems.map((item) => {
            const isActive = location === item.path || 
              (item.path === "/team-pipeline" && location === "/pipeline-analytics") ||
              (item.path === "/pipeline-analytics" && location === "/team-pipeline") ||
              (item.path === "/prospects/pipeline" && location.startsWith("/prospects/pipeline"));
            const Icon = item.icon;
            
            return (
              <Tooltip key={item.path} delayDuration={700}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.path}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] py-2 px-2 rounded-lg transition-colors scroll-snap-align-center no-underline ${
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover-elevate"
                    }`}
                    style={{ scrollSnapAlign: 'center' }}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{item.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          <MoreMenuButton />
        </div>
      </div>
    </nav>
  );

  // Use portal to render directly to body, bypassing any parent transforms
  if (mounted && typeof document !== 'undefined') {
    return createPortal(navContent, document.body);
  }

  return navContent;
}

function useMenuCategories() {
  const { data: userRole } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });
  const { hasFeature, isLoading: permLoading, error: permError, role } = usePermissions();

  const isManager = userRole?.role === "master_admin" || userRole?.role === "relationship_manager";
  const isAdmin = userRole?.role === "master_admin";
  
  const canAccessPath = (path: string): boolean => {
    if (permLoading || permError || !role) return true;
    const featureId = pathToFeatureMap[path];
    if (!featureId) return true;
    return hasFeature(featureId);
  };

  let allCategories = [...menuCategories];
  if (isManager) {
    allCategories = [...allCategories.slice(0, 1), ...managerMenuItems, ...allCategories.slice(1)];
  }
  if (isAdmin) {
    allCategories = [...allCategories, ...adminMenuItems];
  }
  
  return allCategories.map(category => ({
    ...category,
    items: category.items.filter(item => canAccessPath(item.path))
  })).filter(category => category.items.length > 0);
}

function MenuSheetContent({ onNavigate }: { onNavigate: () => void }) {
  const [location] = useLocation();
  const filteredCategories = useMenuCategories();

  return (
    <SheetContent side="left" className="w-[280px] p-0 flex flex-col" style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-bottom, 0px))' }}>
      <SheetHeader className="p-4 border-b flex-shrink-0">
        <SheetTitle className="text-left">Menu</SheetTitle>
      </SheetHeader>
      <ScrollArea className="flex-1 min-h-0">
        <div className="py-2" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
          {filteredCategories.map((category) => (
            <div key={category.title} className="mb-2">
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {category.title}
              </div>
              {category.items.map((item) => {
                const isActive = location === item.path;
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.path} 
                    href={item.path}
                    onClick={onNavigate}
                    data-testid={`menu-${item.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors no-underline ${
                      isActive
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </SheetContent>
  );
}

function MoreMenuButton() {
  const [open, setOpen] = useState(false);
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          data-testid="nav-more"
          className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] py-2 px-2 rounded-lg transition-colors text-muted-foreground hover-elevate"
          style={{ scrollSnapAlign: 'center' }}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium whitespace-nowrap">More</span>
        </button>
      </SheetTrigger>
      <MenuSheetContent onNavigate={() => setOpen(false)} />
    </Sheet>
  );
}

export function HamburgerMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="min-h-[44px] min-w-[44px]"
          data-testid="button-hamburger-menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <MenuSheetContent onNavigate={() => setOpen(false)} />
    </Sheet>
  );
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
