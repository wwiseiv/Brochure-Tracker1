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
  Mail,
  Smartphone,
  Wifi,
  WifiOff,
  Download,
  Clock,
  TrendingUp,
  FileText,
  AlertCircle,
  Keyboard,
  MessageSquare,
  Target,
  History
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

  const gettingStartedItems: HelpItem[] = [
    {
      title: "Install the App",
      description: "Add BrochureDrop to your home screen for quick access. Works offline and feels like a native app.",
      link: "/profile",
      icon: <Download className="w-5 h-5 text-primary" />,
    },
    {
      title: "Your First Drop",
      description: "Tap 'Scan' in the navigation, scan a brochure QR code (or enter manually), then fill in the business details.",
      link: "/scan",
      icon: <Target className="w-5 h-5 text-primary" />,
    },
    {
      title: "Demo Data",
      description: "New users get 3 sample drops automatically to explore the app. You can edit or complete these to learn the workflow.",
      link: "/",
      icon: <FileText className="w-5 h-5 text-primary" />,
    },
  ];

  const agentFeatures: HelpItem[] = [
    {
      title: "Dashboard",
      description: "Your home base. View all drops organized by pickup schedule: today's pickups, upcoming appointments, and overdue items that need immediate attention.",
      link: "/",
      icon: <Home className="w-5 h-5 text-primary" />,
    },
    {
      title: "Scan QR Code",
      description: "Use your phone's camera to scan brochure QR codes. If the code is missing or damaged, tap 'Enter Manually' to type the ID, or 'Skip' to auto-generate a tracking ID.",
      link: "/scan",
      icon: <QrCode className="w-5 h-5 text-primary" />,
    },
    {
      title: "Log New Drop",
      description: "Record business details: name, type, contact info, notes. The app captures your GPS location automatically and converts it to a readable address.",
      link: "/drops/new",
      icon: <ClipboardList className="w-5 h-5 text-primary" />,
    },
    {
      title: "Drop History",
      description: "Browse all your drops in one place. Filter by status (pending, picked up, converted), search by business name, and review your activity.",
      link: "/history",
      icon: <History className="w-5 h-5 text-primary" />,
    },
    {
      title: "Profile & Settings",
      description: "View your stats, configure notification preferences (email, push, timing), and access admin features if you have permissions.",
      link: "/profile",
      icon: <User className="w-5 h-5 text-primary" />,
    },
  ];

  const dropFeatures: HelpItem[] = [
    {
      title: "GPS Location Capture",
      description: "Tap 'Get Current Location' to record where you are. The app uses OpenStreetMap to convert GPS coordinates into a street address automatically.",
      link: "/drops/new",
      icon: <MapPin className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Voice Notes & Transcription",
      description: "Record audio notes about the conversation. AI automatically transcribes your recording into searchable text. Great for capturing details while on the go.",
      link: "/drops/new",
      icon: <Mic className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Schedule Pickups",
      description: "Set a follow-up date when you plan to return. The app organizes your dashboard around these dates and sends reminders before each pickup.",
      link: "/drops/new",
      icon: <Calendar className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Edit Drop Details",
      description: "Tap any drop to update business info, add notes, change the pickup date, or correct any details. Changes are saved immediately.",
      link: "/",
      icon: <Edit className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Record Outcomes",
      description: "After your pickup visit, record what happened: Signed Deal, Interested, Needs More Time, Not Interested, or Couldn't Locate. This tracks your conversion rate.",
      link: "/",
      icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Manual Brochure Entry",
      description: "No QR code? No problem. Enter the brochure ID manually or tap 'Skip' to generate a MANUAL-xxx tracking ID for brochures without codes.",
      link: "/scan",
      icon: <Keyboard className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Pickup Reminders",
      description: "Get notified before scheduled pickups. Configure timing (6, 12, 24, or 48 hours before) and delivery method (email or push) in your profile.",
      link: "/profile",
      icon: <Bell className="w-5 h-5 text-green-600" />,
    },
  ];

  const aiToolsFeatures: HelpItem[] = [
    {
      title: "AI Email Drafter",
      description: "Access from your Profile. Two modes: polish your rough draft or generate a complete email from scratch. Choose tone and purpose for best results.",
      link: "/email",
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
    },
    {
      title: "Polish Your Draft",
      description: "Write an email in your own words - casual, rough, whatever works. Select a tone (Professional, Friendly, Casual, Formal, Persuasive, or Urgent) and AI refines it.",
      link: "/email",
      icon: <Wand2 className="w-5 h-5 text-amber-500" />,
    },
    {
      title: "Generate New Emails",
      description: "Just provide: business name, contact name, and email purpose (Follow-up, Introduction, Thank You, Reminder, Proposal, or Appointment). AI writes the full email.",
      link: "/email",
      icon: <Mail className="w-5 h-5 text-amber-500" />,
    },
    {
      title: "Voice Transcription",
      description: "When you record a voice note, AI transcribes it to text automatically. Review and edit the transcription before saving if needed.",
      link: "/drops/new",
      icon: <MessageSquare className="w-5 h-5 text-amber-500" />,
    },
  ];

  const adminFeatures: HelpItem[] = [
    {
      title: "Admin Dashboard",
      description: "Organization-wide view: total drops, conversion rates, team performance, pending pickups. See all activity across every team member.",
      link: "/admin",
      icon: <BarChart3 className="w-5 h-5 text-blue-600" />,
    },
    {
      title: "Team Management",
      description: "Add, edit, and remove team members. Assign roles and set up reporting hierarchies (which agents report to which managers).",
      link: "/admin/team",
      icon: <Users className="w-5 h-5 text-blue-600" />,
    },
    {
      title: "Add Team Members",
      description: "Invite new users by entering their Replit username. Choose their role (Agent, Relationship Manager, or Admin) and assign a manager if applicable.",
      link: "/admin/team",
      icon: <UserPlus className="w-5 h-5 text-blue-600" />,
    },
    {
      title: "View All Drops",
      description: "See every drop logged by any team member. Filter by agent, date, or status. Identify top performers and those who need coaching.",
      link: "/admin",
      icon: <Eye className="w-5 h-5 text-blue-600" />,
    },
    {
      title: "Performance Metrics",
      description: "Track conversion rates, pickup completion, and activity levels. Compare performance across agents and time periods.",
      link: "/admin",
      icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
    },
    {
      title: "Organization Settings",
      description: "Manage your organization name and structure. Control access levels and team hierarchies.",
      link: "/admin",
      icon: <Building2 className="w-5 h-5 text-blue-600" />,
    },
  ];

  const rmFeatures: HelpItem[] = [
    {
      title: "Manager Dashboard",
      description: "View performance metrics for agents assigned to you: their drops, conversion rates, pending pickups, and activity trends.",
      link: "/manager",
      icon: <BarChart3 className="w-5 h-5 text-purple-600" />,
    },
    {
      title: "Agent Overview",
      description: "See your team at a glance. Quickly identify which agents are on track and who might need support or coaching.",
      link: "/manager",
      icon: <Users className="w-5 h-5 text-purple-600" />,
    },
    {
      title: "Team Drops",
      description: "View all drops made by agents reporting to you. Track progress on pending pickups and review outcomes.",
      link: "/manager",
      icon: <ClipboardList className="w-5 h-5 text-purple-600" />,
    },
    {
      title: "Agent Performance",
      description: "Compare conversion rates across your team. Identify successful patterns and coaching opportunities.",
      link: "/manager",
      icon: <TrendingUp className="w-5 h-5 text-purple-600" />,
    },
  ];

  const offlineFeatures: HelpItem[] = [
    {
      title: "Works Offline",
      description: "BrochureDrop works without an internet connection. Log drops, view history, and record notes - everything syncs when you're back online.",
      link: "/",
      icon: <WifiOff className="w-5 h-5 text-cyan-600" />,
    },
    {
      title: "Install as App",
      description: "Add to your home screen for the best experience. On iOS: tap Share > Add to Home Screen. On Android: tap the menu > Install App.",
      link: "/profile",
      icon: <Smartphone className="w-5 h-5 text-cyan-600" />,
    },
    {
      title: "Auto-Sync",
      description: "Changes made offline sync automatically when you reconnect. No data is lost, even if you lose signal mid-drop.",
      link: "/",
      icon: <Wifi className="w-5 h-5 text-cyan-600" />,
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
            Complete guide to all features and how to use them
          </p>
        </div>

        <HelpSection
          title="Getting Started"
          description="New to BrochureDrop? Start here to get up and running quickly."
          items={gettingStartedItems}
          badge="New Users"
        />

        <Separator />

        <HelpSection
          title="Navigation & Core Features"
          description="The main features you'll use every day as a field sales representative."
          items={agentFeatures}
          badge="All Users"
        />

        <Separator />

        <HelpSection
          title="Drop Management"
          description="Everything you need to know about logging and managing brochure drops."
          items={dropFeatures}
          badge="All Users"
        />

        <Separator />

        <HelpSection
          title="AI-Powered Tools"
          description="Smart features that help you work faster and communicate more effectively."
          items={aiToolsFeatures}
          badge="All Users"
        />

        <Separator />

        <HelpSection
          title="Offline & Mobile"
          description="BrochureDrop is designed for the field - works offline and installs like a native app."
          items={offlineFeatures}
          badge="All Users"
        />

        {(userRole?.role === "master_admin" || userRole?.role === "relationship_manager") && (
          <>
            <Separator />
            
            {userRole?.role === "relationship_manager" && (
              <HelpSection
                title="Relationship Manager Tools"
                description="Monitor and support the agents on your team."
                items={rmFeatures}
                badge="Managers"
              />
            )}

            {userRole?.role === "master_admin" && (
              <>
                <HelpSection
                  title="Admin Tools"
                  description="Manage your entire organization, team, and view all activity."
                  items={adminFeatures}
                  badge="Admins Only"
                />
                
                <Separator />

                <HelpSection
                  title="Manager View"
                  description="As an admin, you also have access to manager features for team oversight."
                  items={rmFeatures}
                  badge="Admins"
                />
              </>
            )}
          </>
        )}

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              User Roles & Permissions
            </CardTitle>
            <CardDescription>
              BrochureDrop has three user roles, each with different access levels:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 shrink-0">Master Admin</Badge>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Full Organization Control</p>
                <p>View all drops across the organization, manage all team members, assign roles, create reporting hierarchies, and access all dashboards.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 shrink-0">Relationship Manager</Badge>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Team Leadership</p>
                <p>View and support agents assigned to you. See their drops, track their performance, and help them succeed. Also functions as an agent with full drop logging capabilities.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 shrink-0">Agent</Badge>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Field Sales Representative</p>
                <p>Log brochure drops, manage your own records, receive pickup reminders, record outcomes, and use AI tools for email drafting.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-sm">How do I log a drop without a QR code?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  On the Scan page, tap "Enter Manually" to type the brochure ID, or tap "Skip - No Brochure ID" to auto-generate a MANUAL-xxx tracking ID. Both options take you to the drop form.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-sm">Why isn't my location being captured?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Make sure location services are enabled for your browser. On iOS, go to Settings {">"} Privacy {">"} Location Services. On Android, check Settings {">"} Location. The app needs permission to access your GPS.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-sm">How do I install the app on my phone?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  <strong>iOS:</strong> Open in Safari, tap the Share button, then "Add to Home Screen."<br/>
                  <strong>Android:</strong> Open in Chrome, tap the menu (three dots), then "Install App" or "Add to Home Screen."
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-sm">Can I use the app without internet?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes! BrochureDrop works offline. You can view your drops, log new ones, and record notes. Everything syncs automatically when you're back online. Voice transcription requires internet.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5">
                <AccordionTrigger className="text-sm">How do voice notes work?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Tap the microphone icon while logging a drop to record. When you stop, the app sends your audio to AI for transcription. Review the text and edit if needed before saving.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-6">
                <AccordionTrigger className="text-sm">What are the outcome options?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  After a pickup visit, record one of: <strong>Signed Deal</strong> (they became a customer), <strong>Interested</strong> (positive response, need follow-up), <strong>Needs More Time</strong> (not ready yet), <strong>Not Interested</strong> (declined), or <strong>Couldn't Locate</strong> (business closed/moved).
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-7">
                <AccordionTrigger className="text-sm">How do I change my notification settings?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Go to Profile {">"} Notification Settings. Toggle notifications on/off, choose email or push delivery, and set how far in advance you want pickup reminders (6, 12, 24, or 48 hours).
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-8">
                <AccordionTrigger className="text-sm">How does the AI Email Drafter work?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Access it from Profile {">"} AI Email Drafter. Two modes: (1) Write a rough draft and AI polishes it, or (2) Tell AI the business name, contact, and purpose - it writes the whole email. Choose a tone to match your style.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Daily Workflow Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span>
              <p><strong>Morning:</strong> Check your dashboard for today's pickups and plan your route.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span>
              <p><strong>On-site:</strong> Scan the brochure, capture location, record voice notes about the conversation.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">3.</span>
              <p><strong>After visit:</strong> Use AI Email Drafter to send a quick follow-up while details are fresh.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">4.</span>
              <p><strong>Pickup visits:</strong> Record the outcome immediately to keep your stats accurate.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">5.</span>
              <p><strong>End of day:</strong> Review overdue pickups and reschedule as needed.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Need More Help?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>If you're stuck or have questions not covered here, reach out to your manager or admin. They can help with account access, team setup, and troubleshooting.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
