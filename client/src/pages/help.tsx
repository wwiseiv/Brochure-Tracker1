import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Home, 
  QrCode, 
  ClipboardList, 
  MapPin, 
  Mic, 
  Calendar, 
  Bell,
  User,
  Settings,
  Shield,
  Users,
  BarChart3,
  UserPlus,
  Building2,
  Eye,
  Edit,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Wand2,
  Mail
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface UserRole {
  role: string;
  memberId: number;
  organization: {
    id: number;
    name: string;
  };
  managerId: number | null;
}

interface HelpItem {
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
}

function HelpSection({ 
  title, 
  description, 
  items,
  badge
}: { 
  title: string; 
  description: string; 
  items: HelpItem[];
  badge?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {badge && <Badge variant="secondary">{badge}</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="grid gap-3">
        {items.map((item, index) => (
          <Link key={index} href={item.link}>
            <Card className="hover-elevate cursor-pointer transition-all">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function HelpPage() {
  const { data: userRole } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  const agentFeatures: HelpItem[] = [
    {
      title: "Dashboard",
      description: "View all your drops organized by pickup schedule. See today's pickups, upcoming appointments, and overdue items that need attention.",
      link: "/",
      icon: <Home className="w-5 h-5 text-primary" />,
    },
    {
      title: "Scan QR Code",
      description: "Use your phone's camera to scan the QR code on a video brochure. If the QR code is missing or damaged, you can enter the ID manually or skip it entirely.",
      link: "/scan",
      icon: <QrCode className="w-5 h-5 text-primary" />,
    },
    {
      title: "Log New Drop",
      description: "After scanning, enter business details including name, type, contact info, and location. The app can automatically capture your GPS coordinates.",
      link: "/drops/new",
      icon: <ClipboardList className="w-5 h-5 text-primary" />,
    },
    {
      title: "Drop History",
      description: "View a complete history of all your brochure drops. Filter by status, search by business name, and track your activity over time.",
      link: "/history",
      icon: <Calendar className="w-5 h-5 text-primary" />,
    },
    {
      title: "Profile & Settings",
      description: "Manage your account settings, notification preferences, and view your performance stats.",
      link: "/profile",
      icon: <User className="w-5 h-5 text-primary" />,
    },
  ];

  const dropFeatures: HelpItem[] = [
    {
      title: "GPS Location Capture",
      description: "Automatically records your location when logging a drop. Uses OpenStreetMap to convert coordinates into a readable address.",
      link: "/drops/new",
      icon: <MapPin className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Voice Notes",
      description: "Record audio notes about the business or conversation. Notes are automatically transcribed using AI for easy searching later.",
      link: "/drops/new",
      icon: <Mic className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Schedule Pickups",
      description: "Set a follow-up date when you plan to return. The app will remind you when it's time to go back and have the conversion conversation.",
      link: "/drops/new",
      icon: <Calendar className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Edit Drop Details",
      description: "Update business information, add notes, change pickup dates, or record outcomes after your follow-up visit.",
      link: "/",
      icon: <Edit className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Record Outcomes",
      description: "After your pickup visit, record what happened: signed deal, interested, needs time, not interested, or couldn't locate.",
      link: "/",
      icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Notifications",
      description: "Get reminders before scheduled pickups. Configure notification preferences in your profile settings.",
      link: "/profile",
      icon: <Bell className="w-5 h-5 text-green-600" />,
    },
  ];

  const adminFeatures: HelpItem[] = [
    {
      title: "Admin Dashboard",
      description: "View organization-wide statistics including total drops, conversion rates, team performance metrics, and pending pickups across all agents.",
      link: "/admin",
      icon: <BarChart3 className="w-5 h-5 text-blue-600" />,
    },
    {
      title: "Team Management",
      description: "Add, edit, and remove team members. Assign roles (Agent, Relationship Manager, Master Admin) and set up reporting hierarchies.",
      link: "/admin/team",
      icon: <Users className="w-5 h-5 text-blue-600" />,
    },
    {
      title: "Add Team Members",
      description: "Invite new agents and relationship managers to your organization. Assign them to managers for proper team structure.",
      link: "/admin/team",
      icon: <UserPlus className="w-5 h-5 text-blue-600" />,
    },
    {
      title: "View All Drops",
      description: "See every drop logged by any team member. Monitor activity, track performance, and identify top performers.",
      link: "/admin",
      icon: <Eye className="w-5 h-5 text-blue-600" />,
    },
    {
      title: "Organization Settings",
      description: "Manage your organization name and settings. Control access and permissions for your team.",
      link: "/admin",
      icon: <Building2 className="w-5 h-5 text-blue-600" />,
    },
  ];

  const rmFeatures: HelpItem[] = [
    {
      title: "Manager Dashboard",
      description: "View performance metrics for agents assigned to you. See their drops, conversion rates, and pending pickups.",
      link: "/manager",
      icon: <BarChart3 className="w-5 h-5 text-purple-600" />,
    },
    {
      title: "Agent Overview",
      description: "Monitor your team's activity. See which agents are meeting goals and who might need support.",
      link: "/manager",
      icon: <Users className="w-5 h-5 text-purple-600" />,
    },
    {
      title: "Team Drops",
      description: "View all drops made by agents reporting to you. Track progress and identify coaching opportunities.",
      link: "/manager",
      icon: <ClipboardList className="w-5 h-5 text-purple-600" />,
    },
  ];

  const aiToolsFeatures: HelpItem[] = [
    {
      title: "AI Email Drafter",
      description: "Use AI to draft professional follow-up emails to merchants. Just write your thoughts and the AI will polish it into a professional message.",
      link: "/email",
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
    },
    {
      title: "Polish Your Draft",
      description: "Write a rough email in your own words, choose the tone, and AI will transform it into a professional, persuasive message.",
      link: "/email",
      icon: <Wand2 className="w-5 h-5 text-amber-500" />,
    },
    {
      title: "Generate New Emails",
      description: "Provide the business name, contact, and purpose - AI will generate a complete email ready to send.",
      link: "/email",
      icon: <Mail className="w-5 h-5 text-amber-500" />,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Link href="/profile">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">Help & Guide</h1>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-8 max-w-2xl mx-auto">
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold text-primary">BrochureDrop Help</h1>
          <p className="text-muted-foreground mt-2">
            Learn how to use all the features in BrochureDrop
          </p>
        </div>

        <HelpSection
          title="Agent Features"
          description="Core features for field sales representatives to track brochure deployments."
          items={agentFeatures}
          badge="All Users"
        />

        <Separator />

        <HelpSection
          title="Drop Management"
          description="Features for logging and managing individual brochure drops."
          items={dropFeatures}
          badge="All Users"
        />

        <Separator />

        <HelpSection
          title="AI Tools"
          description="AI-powered features to help you communicate more effectively with merchants."
          items={aiToolsFeatures}
          badge="All Users"
        />

        {(userRole?.role === "master_admin" || userRole?.role === "relationship_manager") && (
          <>
            <Separator />
            
            {userRole?.role === "relationship_manager" && (
              <HelpSection
                title="Relationship Manager Features"
                description="Tools for managing your team of agents and monitoring their performance."
                items={rmFeatures}
                badge="Managers"
              />
            )}

            {userRole?.role === "master_admin" && (
              <HelpSection
                title="Admin Features"
                description="Administrative tools for managing your organization and team."
                items={adminFeatures}
                badge="Admins Only"
              />
            )}
          </>
        )}

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Role-Based Access
            </CardTitle>
            <CardDescription>
              BrochureDrop has three user roles with different permissions:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Admin</Badge>
              <p className="text-sm text-muted-foreground">
                Full access to all features. Can manage team members, view all drops, and configure organization settings.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Manager</Badge>
              <p className="text-sm text-muted-foreground">
                Can view and manage agents assigned to them. See team performance metrics and all drops from their agents.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Agent</Badge>
              <p className="text-sm text-muted-foreground">
                Field sales representatives. Can log drops, manage their own records, and receive pickup reminders.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Install the app to your home screen for quick access</p>
            <p>• Enable location services for automatic GPS capture</p>
            <p>• Use voice notes to quickly capture conversation details</p>
            <p>• Check your dashboard daily for pickup reminders</p>
            <p>• Record outcomes after each pickup visit to track conversions</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
