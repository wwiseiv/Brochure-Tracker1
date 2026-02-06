import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePermissions } from "@/contexts/PermissionContext";
import { BottomNav, HamburgerMenu } from "@/components/BottomNav";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Home,
  CalendarCheck,
  Building2,
  Target,
  QrCode,
  FileSignature,
  GraduationCap,
  User,
  Users,
  Sparkles,
  MapPin,
  FileText,
  BarChart3,
  MessageSquare,
  Package,
  History,
  Users2,
  Briefcase,
  PenTool,
  HelpCircle,
  Shield,
  Megaphone,
  Menu,
  Trophy,
  PlayCircle,
  MessageSquarePlus,
  BookOpen,
  Swords,
} from "lucide-react";
import pcbLogoFullColor from "@/assets/pcb_logo_fullcolor.png";

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

const menuCategories = [
  {
    title: "Main",
    items: [
      { path: "/", icon: Home, label: "Home" },
      { path: "/today", icon: CalendarCheck, label: "Today" },
      { path: "/merchants", icon: Building2, label: "CRM / Merchants" },
      { path: "/prospects/pipeline", icon: Target, label: "Pipeline" },
    ],
  },
  {
    title: "Prospecting",
    items: [
      { path: "/prospects/search", icon: Sparkles, label: "AI Prospect Finder" },
      { path: "/route", icon: MapPin, label: "Route Planner" },
    ],
  },
  {
    title: "Documents",
    items: [
      { path: "/scan", icon: QrCode, label: "Scan Brochure" },
      { path: "/esign", icon: FileSignature, label: "E-Sign" },
      { path: "/proposal-generator", icon: FileText, label: "Proposal Generator" },
      { path: "/statement-analyzer", icon: BarChart3, label: "Statement Analyzer" },
      { path: "/marketing", icon: Megaphone, label: "Marketing Materials" },
    ],
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
    ],
  },
  {
    title: "Activity",
    items: [
      { path: "/history", icon: History, label: "Drop History" },
      { path: "/referrals", icon: Users2, label: "Referrals" },
      { path: "/my-work", icon: Briefcase, label: "My Work" },
      { path: "/activity", icon: PenTool, label: "Activity Feed" },
    ],
  },
  {
    title: "Settings",
    items: [
      { path: "/profile", icon: User, label: "Profile & Settings" },
      { path: "/help", icon: HelpCircle, label: "Help & Support" },
    ],
  },
];

const managerMenuItems = [
  {
    title: "Team Management",
    items: [
      { path: "/team-pipeline", icon: Users, label: "Team Pipeline" },
      { path: "/pipeline-analytics", icon: BarChart3, label: "Pipeline Analytics" },
      { path: "/admin/team", icon: Users2, label: "Team Management" },
    ],
  },
];

const adminMenuItems = [
  {
    title: "Admin",
    items: [
      { path: "/admin", icon: Shield, label: "Admin Dashboard" },
      { path: "/admin/feedback", icon: MessageSquarePlus, label: "Feedback & Issues" },
    ],
  },
];

function AppSidebar() {
  const [location] = useLocation();
  const { data: userRole } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });
  const { hasFeature, isLoading: permLoading } = usePermissions();

  const isManager = userRole?.role === "master_admin" || userRole?.role === "relationship_manager";
  const isAdmin = userRole?.role === "master_admin";

  const canAccessPath = (path: string): boolean => {
    if (permLoading) return true;
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

  const filteredCategories = allCategories
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => canAccessPath(item.path)),
    }))
    .filter((category) => category.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center">
          <img src={pcbLogoFullColor} alt="PCBancard" className="h-8 w-auto" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-full">
          {filteredCategories.map((category) => (
            <SidebarGroup key={category.title}>
              <SidebarGroupLabel>{category.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {category.items.map((item) => {
                    const isActive = location === item.path;
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                        >
                          <Link href={item.path} data-testid={`sidebar-${item.label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t">
        <div className="text-xs text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
          PCBancard Field Sales
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function DesktopHeader() {
  return (
    <header className="h-14 border-b bg-background flex items-center px-4 gap-4 sticky top-0 z-40">
      <SidebarTrigger data-testid="button-sidebar-toggle" />
      <div className="flex-1" />
    </header>
  );
}


interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 pb-20">{children}</main>
        <BottomNav />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <DesktopHeader />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
