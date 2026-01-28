import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  History,
  Store,
  Package,
  Share2,
  Activity,
  Navigation,
  Zap,
  BellRing,
  RefreshCw,
  Database,
  Brain,
  Route,
  MapPinned,
  StickyNote,
  Repeat,
  Lightbulb,
  Send,
  Search,
  X
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
  const { toast } = useToast();
  const { data: userRole } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackType, setFeedbackType] = useState<string>("feature_suggestion");
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const feedbackMutation = useMutation({
    mutationFn: async (data: { type: string; subject: string; message: string }) => {
      await apiRequest("POST", "/api/feedback", data);
    },
    onSuccess: () => {
      toast({
        title: "Thanks for your feedback!",
        description: "We'll get back to you soon.",
      });
      setFeedbackType("feature_suggestion");
      setFeedbackSubject("");
      setFeedbackMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit feedback",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in both subject and message.",
        variant: "destructive",
      });
      return;
    }
    feedbackMutation.mutate({
      type: feedbackType,
      subject: feedbackSubject,
      message: feedbackMessage,
    });
  };

  const gettingStartedItems: HelpItem[] = [
    {
      title: "Install the App",
      description: "Add BrochureTracker to your home screen for quick access. Works offline and feels like a native app.",
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
    {
      title: "Export Drop History",
      description: "Download all your drops as a CSV or Excel spreadsheet. Export includes business info, dates, addresses, notes, and outcomes.",
      link: "/history",
      icon: <Download className="w-5 h-5 text-green-600" />,
    },
  ];

  const aiToolsFeatures: HelpItem[] = [
    {
      title: "AI Sales Coach",
      description: "Open any drop from the dashboard and tap 'Practice Role-Play'. Choose between Get Coaching (ask questions) or Practice Role-Play (simulate conversations with merchants).",
      link: "/",
      icon: <Users className="w-5 h-5 text-amber-500" />,
    },
    {
      title: "Coaching Mode",
      description: "Ask questions like 'What should I say when they object to the price?' or 'How do I approach a busy restaurant?' Get advice based on NEPQ methodology and PCBancard training.",
      link: "/",
      icon: <Lightbulb className="w-5 h-5 text-amber-500" />,
    },
    {
      title: "Role-Play Mode",
      description: "Practice conversations with AI-simulated business owners. Choose scenarios: Cold Approach, Objection Handling, Closing, Follow-up, or General Practice.",
      link: "/",
      icon: <Target className="w-5 h-5 text-amber-500" />,
    },
    {
      title: "Voice Conversations",
      description: "Tap the mic button to speak instead of typing. Your voice is transcribed and sent automatically. Use the 'Auto-play voice' toggle to hear AI responses spoken aloud.",
      link: "/",
      icon: <Mic className="w-5 h-5 text-amber-500" />,
    },
    {
      title: "Performance Feedback",
      description: "Tap 'End & Get Feedback' to finish your role-play session. See your score (0-100), strengths, areas to improve, and a top tip for your next conversation.",
      link: "/",
      icon: <BarChart3 className="w-5 h-5 text-amber-500" />,
    },
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
      title: "Voice Transcription & AI Summary",
      description: "Record voice notes and AI transcribes them automatically. Get AI-generated summaries of your notes to quickly review key points.",
      link: "/drops/new",
      icon: <MessageSquare className="w-5 h-5 text-amber-500" />,
    },
    {
      title: "Lead Scoring",
      description: "AI analyzes merchant interactions and predicts conversion likelihood. See lead scores on merchant profiles to prioritize your follow-ups.",
      link: "/merchants",
      icon: <Brain className="w-5 h-5 text-amber-500" />,
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
      description: "Create drops even without internet. Log business details, record notes, and capture locations - all saved locally until you're back online.",
      link: "/",
      icon: <WifiOff className="w-5 h-5 text-cyan-600" />,
    },
    {
      title: "Automatic Sync",
      description: "When you reconnect to the internet, all your offline work syncs automatically. No manual upload required - it just works.",
      link: "/",
      icon: <RefreshCw className="w-5 h-5 text-cyan-600" />,
    },
    {
      title: "View Cached Data",
      description: "Access your existing drops, merchant profiles, and history even when offline. The app caches your data for seamless field work.",
      link: "/",
      icon: <Database className="w-5 h-5 text-cyan-600" />,
    },
    {
      title: "Install as App",
      description: "Add to your home screen for the best experience. On iOS: tap Share > Add to Home Screen. On Android: tap the menu > Install App.",
      link: "/profile",
      icon: <Smartphone className="w-5 h-5 text-cyan-600" />,
    },
  ];

  const merchantFeatures: HelpItem[] = [
    {
      title: "View All Merchants",
      description: "See every merchant you've visited in one place. Browse your complete merchant database with search and filter options.",
      link: "/merchants",
      icon: <Store className="w-5 h-5 text-indigo-600" />,
    },
    {
      title: "Visit History & Notes",
      description: "Track every interaction with each merchant. See when you visited, what was discussed, and the outcomes of each visit.",
      link: "/merchants",
      icon: <History className="w-5 h-5 text-indigo-600" />,
    },
    {
      title: "Lead Scores & Stats",
      description: "View AI-predicted conversion likelihood for each merchant. Track conversion rates and identify your hottest prospects.",
      link: "/merchants",
      icon: <TrendingUp className="w-5 h-5 text-indigo-600" />,
    },
    {
      title: "Build Your Dossier",
      description: "Add notes to build comprehensive merchant profiles. Record preferences, decision-makers, and any insights that help close deals.",
      link: "/merchants",
      icon: <StickyNote className="w-5 h-5 text-indigo-600" />,
    },
    {
      title: "Export Merchant Data",
      description: "Download your merchant contacts as a CSV or Excel file. Great for importing into other tools or creating reports.",
      link: "/merchants",
      icon: <Download className="w-5 h-5 text-indigo-600" />,
    },
  ];

  const inventoryFeatures: HelpItem[] = [
    {
      title: "Track Brochure Inventory",
      description: "Know exactly how many brochures you have on hand. Track quantities by type and never run out in the field.",
      link: "/inventory",
      icon: <Package className="w-5 h-5 text-orange-600" />,
    },
    {
      title: "Individual Brochure Tracking",
      description: "Track each brochure by QR code with complete chain of custody. See who has each brochure and full transfer history.",
      link: "/inventory",
      icon: <Database className="w-5 h-5 text-orange-600" />,
    },
    {
      title: "Scan to Register",
      description: "Use your phone camera to scan brochure QR codes directly into inventory. No manual data entry needed.",
      link: "/inventory",
      icon: <QrCode className="w-5 h-5 text-orange-600" />,
    },
    {
      title: "Scan & Assign",
      description: "Scan brochures and assign them directly to team members in one step. Perfect for handing out brochures to agents.",
      link: "/inventory",
      icon: <Send className="w-5 h-5 text-orange-600" />,
    },
    {
      title: "CSV Import/Export",
      description: "Bulk import brochure IDs from a CSV file or export your inventory to spreadsheets. Select specific holders for import or export.",
      link: "/inventory",
      icon: <FileText className="w-5 h-5 text-orange-600" />,
    },
    {
      title: "Low-Stock Alerts",
      description: "Set thresholds to get notified when inventory runs low. Never be caught without brochures during a sales call.",
      link: "/inventory",
      icon: <BellRing className="w-5 h-5 text-orange-600" />,
    },
    {
      title: "Restock Tracking",
      description: "Log when you receive more brochures. Keep accurate counts and know when to request more from the office.",
      link: "/inventory",
      icon: <RefreshCw className="w-5 h-5 text-orange-600" />,
    },
    {
      title: "Restock History",
      description: "View your complete restock history. See patterns in usage and plan ahead for busy periods.",
      link: "/inventory",
      icon: <History className="w-5 h-5 text-orange-600" />,
    },
  ];

  const referralFeatures: HelpItem[] = [
    {
      title: "Log Referrals",
      description: "When a merchant refers you to another business, log it here. Track the source of every new lead.",
      link: "/referrals",
      icon: <Share2 className="w-5 h-5 text-pink-600" />,
    },
    {
      title: "Track Referral Status",
      description: "Monitor referral progress: Pending (not yet contacted), Contacted (in progress), or Converted (became a customer).",
      link: "/referrals",
      icon: <Target className="w-5 h-5 text-pink-600" />,
    },
    {
      title: "Referral Credits",
      description: "Get credit for successful referrals. Track which merchants are your best referral sources.",
      link: "/referrals",
      icon: <CheckCircle2 className="w-5 h-5 text-pink-600" />,
    },
    {
      title: "Export Referrals",
      description: "Download your referral data as a CSV or Excel spreadsheet. Perfect for tracking and reporting.",
      link: "/referrals",
      icon: <Download className="w-5 h-5 text-pink-600" />,
    },
  ];

  const activityFeatures: HelpItem[] = [
    {
      title: "Team Activity Feed",
      description: "See what your team is accomplishing in real-time. Stay connected and motivated with live updates.",
      link: "/activity",
      icon: <Activity className="w-5 h-5 text-teal-600" />,
    },
    {
      title: "Celebrate Wins",
      description: "When a teammate signs a deal, everyone sees it. Celebrate successes and build team morale.",
      link: "/activity",
      icon: <Zap className="w-5 h-5 text-teal-600" />,
    },
    {
      title: "Track Team Performance",
      description: "Monitor team activity levels, drop counts, and conversions. Identify top performers and trends.",
      link: "/activity",
      icon: <BarChart3 className="w-5 h-5 text-teal-600" />,
    },
  ];

  const routeFeatures: HelpItem[] = [
    {
      title: "Plan Efficient Routes",
      description: "Optimize your driving route for all pickups. Save time and gas by visiting merchants in the most efficient order.",
      link: "/route",
      icon: <Route className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: "Daily Pickup Order",
      description: "See all your scheduled pickups for the day arranged in optimal driving order. Know exactly where to go next.",
      link: "/route",
      icon: <Navigation className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: "Open in Google Maps",
      description: "Tap to open your route directly in Google Maps with turn-by-turn navigation to each stop.",
      link: "/route",
      icon: <MapPinned className="w-5 h-5 text-emerald-600" />,
    },
  ];

  const sequenceFeatures: HelpItem[] = [
    {
      title: "Follow-up Campaigns",
      description: "View available automated follow-up sequences. Choose the right campaign for each merchant situation.",
      link: "/sequences",
      icon: <Repeat className="w-5 h-5 text-violet-600" />,
    },
    {
      title: "Start Sequences on Drops",
      description: "Enroll merchants in automated follow-up sequences. Let the system handle timing while you focus on new prospects.",
      link: "/sequences",
      icon: <Zap className="w-5 h-5 text-violet-600" />,
    },
    {
      title: "Track Sequence Progress",
      description: "See where each merchant is in their follow-up sequence. Monitor email opens, responses, and engagement.",
      link: "/sequences",
      icon: <BarChart3 className="w-5 h-5 text-violet-600" />,
    },
  ];

  const locationReminderFeatures: HelpItem[] = [
    {
      title: "Nearby Pickup Alerts",
      description: "Get notified when you're near a merchant with a pending pickup. Never miss an opportunity when you're in the area.",
      link: "/profile",
      icon: <MapPinned className="w-5 h-5 text-rose-600" />,
    },
    {
      title: "Smart Notifications",
      description: "Location-based reminders only trigger for relevant merchants. Stay informed without being overwhelmed.",
      link: "/profile",
      icon: <BellRing className="w-5 h-5 text-rose-600" />,
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
          <h1 className="text-2xl font-bold text-primary">BrochureTracker Help</h1>
          <p className="text-muted-foreground mt-2">
            Complete guide to all features and how to use them
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
            data-testid="input-help-search"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setSearchQuery("")}
              data-testid="button-clear-search"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {(() => {
          const query = searchQuery.toLowerCase().trim();
          
          const allSections = [
            { title: "Getting Started", description: "New to BrochureTracker? Start here to get up and running quickly.", items: gettingStartedItems, badge: "New Users" },
            { title: "Navigation & Core Features", description: "The main features you'll use every day as a field sales representative.", items: agentFeatures, badge: "All Users" },
            { title: "Drop Management", description: "Everything you need to know about logging and managing brochure drops.", items: dropFeatures, badge: "All Users" },
            { title: "AI-Powered Tools", description: "Smart features that help you work faster and communicate more effectively.", items: aiToolsFeatures, badge: "All Users" },
            { title: "Offline & Mobile", description: "BrochureTracker is designed for the field - works offline and installs like a native app.", items: offlineFeatures, badge: "All Users" },
            { title: "Merchant Profiles", description: "Build comprehensive profiles of every merchant you visit. Track history, notes, and conversion likelihood.", items: merchantFeatures, badge: "All Users" },
            { title: "Inventory Tracking", description: "Keep track of your brochure inventory so you never run out in the field.", items: inventoryFeatures, badge: "All Users" },
            { title: "Referral Tracking", description: "Log and track referrals from existing merchants to grow your network.", items: referralFeatures, badge: "All Users" },
            { title: "Team Activity Feed", description: "Stay connected with your team and celebrate wins together.", items: activityFeatures, badge: "All Users" },
            { title: "Route Optimizer", description: "Plan the most efficient driving routes for your daily pickups.", items: routeFeatures, badge: "All Users" },
            { title: "Follow-up Sequences", description: "Automate your follow-up process with pre-built email sequences.", items: sequenceFeatures, badge: "All Users" },
            { title: "Smart Location Reminders", description: "Get notified when you're near merchants with pending pickups.", items: locationReminderFeatures, badge: "All Users" },
          ];

          const filteredSections = query
            ? allSections.map(section => {
                const sectionMatches = section.title.toLowerCase().includes(query) || 
                                       section.description.toLowerCase().includes(query);
                const filteredItems = section.items.filter(item =>
                  item.title.toLowerCase().includes(query) ||
                  item.description.toLowerCase().includes(query)
                );
                if (sectionMatches) return section;
                if (filteredItems.length > 0) return { ...section, items: filteredItems };
                return null;
              }).filter(Boolean)
            : allSections;

          if (query && filteredSections.length === 0) {
            return (
              <Card className="p-8 text-center" data-testid="text-no-results">
                <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No results found</h3>
                <p className="text-sm text-muted-foreground">
                  Try searching for different keywords like "QR code", "offline", or "email"
                </p>
              </Card>
            );
          }

          return filteredSections.map((section, index) => (
            <div key={section!.title}>
              {index > 0 && <Separator className="my-8" />}
              <HelpSection
                title={section!.title}
                description={section!.description}
                items={section!.items}
                badge={section!.badge}
              />
            </div>
          ));
        })()}

        {!searchQuery && (
          <>
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
              BrochureTracker has three user roles, each with different access levels:
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
                  Yes! BrochureTracker works offline. You can view your drops, log new ones, and record notes. Everything syncs automatically when you're back online. Voice transcription requires internet.
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
              <AccordionItem value="item-9">
                <AccordionTrigger className="text-sm">What are Merchant Profiles?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Merchant Profiles (at /merchants) show all the businesses you've visited. Each profile includes visit history, notes, outcomes, and an AI-predicted lead score. Use notes to build a "dossier" of insights that help you close deals.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-10">
                <AccordionTrigger className="text-sm">How do I track my brochure inventory?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Go to /inventory to track how many brochures you have. Set low-stock alerts to get notified before running out. When you receive more brochures, log a restock to keep counts accurate.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-11">
                <AccordionTrigger className="text-sm">How do referrals work?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  When a merchant refers you to another business, log it at /referrals. Track each referral's status: Pending (not contacted yet), Contacted (in progress), or Converted (became a customer). You get credit for successful referral conversions.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-12">
                <AccordionTrigger className="text-sm">What is the Team Activity Feed?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  The Activity Feed (at /activity) shows real-time updates of what your team is accomplishing. See when teammates log drops, complete pickups, or sign deals. It's a great way to stay motivated and celebrate wins together.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-13">
                <AccordionTrigger className="text-sm">How does the Route Optimizer work?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Go to /route to see your scheduled pickups arranged in the most efficient driving order. The optimizer minimizes travel time between stops. Tap "Open in Google Maps" to get turn-by-turn directions to each location.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-14">
                <AccordionTrigger className="text-sm">What are Follow-up Sequences?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Follow-up Sequences (at /sequences) are automated email campaigns. When you drop a brochure, you can enroll the merchant in a sequence that sends timed follow-up emails automatically. Track opens and responses to see engagement.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-15">
                <AccordionTrigger className="text-sm">What are Smart Location Reminders?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Smart Location Reminders notify you when you're near a merchant with a pending pickup. Enable location services and the app will alert you when an opportunity is nearby, so you never miss a chance to follow up.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-16">
                <AccordionTrigger className="text-sm">How does Lead Scoring work?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  AI analyzes your interactions with each merchant - visit frequency, notes, outcomes - and predicts how likely they are to convert. Higher scores mean hotter prospects. Use lead scores to prioritize your follow-up efforts.
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

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Feature Suggestions & Help
            </CardTitle>
            <CardDescription>
              Have a feature idea or need help? Let us know!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feedback-type">Type</Label>
                <Select value={feedbackType} onValueChange={setFeedbackType}>
                  <SelectTrigger id="feedback-type" data-testid="select-feedback-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature_suggestion">Feature Suggestion</SelectItem>
                    <SelectItem value="help_request">Help Request</SelectItem>
                    <SelectItem value="bug_report">Bug Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-subject">Subject</Label>
                <Input
                  id="feedback-subject"
                  placeholder="Brief summary of your feedback"
                  value={feedbackSubject}
                  onChange={(e) => setFeedbackSubject(e.target.value)}
                  required
                  data-testid="input-feedback-subject"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-message">Message</Label>
                <Textarea
                  id="feedback-message"
                  placeholder="Describe your feature idea, question, or issue..."
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  required
                  className="min-h-[120px]"
                  data-testid="textarea-feedback-message"
                />
              </div>

              <Button
                type="submit"
                disabled={feedbackMutation.isPending}
                className="w-full"
                data-testid="button-submit-feedback"
              >
                {feedbackMutation.isPending ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </form>
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
          </>
        )}
      </main>
    </div>
  );
}
