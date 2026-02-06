import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { usePermissions } from "@/contexts/PermissionContext";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
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
  MessageSquarePlus,
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
  X,
  FileSignature,
  GraduationCap,
  Calculator,
  FileSpreadsheet,
  DollarSign,
  Rocket,
  Star,
  Copy,
  FileDown,
  Upload,
  Camera,
  Globe,
  ChevronRight,
  Flame,
  LayoutGrid,
  Megaphone,
  Image,
  MoreVertical,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

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

interface HelpSectionData {
  title: string;
  description: string;
  items: HelpItem[];
  badge?: string;
  requiredFeature?: string;
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

interface FeedbackAttachment {
  objectPath: string;
  name: string;
  size: number;
  contentType: string;
}

interface FeedbackFileUploadItem {
  id: string;
  file: File;
  status: "uploading" | "done" | "error";
  progress: number;
  attachment?: FeedbackAttachment;
  previewUrl?: string;
  errorMessage?: string;
}

const FEEDBACK_MAX_FILES = 5;
const FEEDBACK_MAX_FILE_SIZE = 10 * 1024 * 1024;
const FEEDBACK_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadFeedbackFile(file: File): Promise<FeedbackAttachment> {
  const isPdf = file.type === "application/pdf";
  const endpoint = isPdf ? "/api/uploads/documents" : "/api/uploads/proxy";
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Upload failed");
  }
  const data = await response.json();
  return {
    objectPath: data.objectPath,
    name: data.metadata.name,
    size: data.metadata.size,
    contentType: data.metadata.contentType,
  };
}

export default function HelpPage() {
  const { toast } = useToast();
  const { hasFeature } = usePermissions();
  const isMobile = useIsMobile();
  const { data: userRole } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState("");
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackFiles, setFeedbackFiles] = useState<FeedbackFileUploadItem[]>([]);
  const [isFeedbackDragOver, setIsFeedbackDragOver] = useState(false);
  const feedbackFileInputRef = useRef<HTMLInputElement>(null);

  const resetFeedbackForm = useCallback(() => {
    setFeedbackType("");
    setFeedbackSubject("");
    setFeedbackMessage("");
    setFeedbackFiles((prev) => {
      prev.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
      return [];
    });
  }, []);

  const feedbackSubmitMutation = useMutation({
    mutationFn: async () => {
      const attachments = feedbackFiles
        .filter((f) => f.status === "done" && f.attachment)
        .map((f) => f.attachment!);
      await apiRequest("POST", "/api/feedback", {
        type: feedbackType,
        subject: feedbackSubject,
        message: feedbackMessage,
        attachments,
      });
    },
    onSuccess: () => {
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback. We will review it shortly.",
      });
      resetFeedbackForm();
      setFeedbackOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit feedback",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFeedbackFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const currentCount = feedbackFiles.length;
      const remaining = FEEDBACK_MAX_FILES - currentCount;
      if (remaining <= 0) {
        toast({
          title: "File limit reached",
          description: `Maximum ${FEEDBACK_MAX_FILES} files allowed.`,
          variant: "destructive",
        });
        return;
      }
      const filesToAdd = fileArray.slice(0, remaining);
      filesToAdd.forEach((file) => {
        if (!FEEDBACK_ACCEPTED_TYPES.includes(file.type)) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a supported file type.`,
            variant: "destructive",
          });
          return;
        }
        if (file.size > FEEDBACK_MAX_FILE_SIZE) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds the 10MB limit.`,
            variant: "destructive",
          });
          return;
        }
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const previewUrl = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined;
        const item: FeedbackFileUploadItem = {
          id,
          file,
          status: "uploading",
          progress: 50,
          previewUrl,
        };
        setFeedbackFiles((prev) => [...prev, item]);
        uploadFeedbackFile(file)
          .then((attachment) => {
            setFeedbackFiles((prev) =>
              prev.map((f) =>
                f.id === id
                  ? { ...f, status: "done" as const, progress: 100, attachment }
                  : f
              )
            );
          })
          .catch((err) => {
            setFeedbackFiles((prev) =>
              prev.map((f) =>
                f.id === id
                  ? { ...f, status: "error" as const, errorMessage: err.message }
                  : f
              )
            );
          });
      });
    },
    [feedbackFiles.length, toast]
  );

  const removeFeedbackFile = useCallback((id: string) => {
    setFeedbackFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const handleFeedbackDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsFeedbackDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFeedbackFiles(e.dataTransfer.files);
      }
    },
    [handleFeedbackFiles]
  );

  const handleFeedbackDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsFeedbackDragOver(true);
  }, []);

  const handleFeedbackDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsFeedbackDragOver(false);
  }, []);

  const hasFeedbackUploading = feedbackFiles.some((f) => f.status === "uploading");
  const canSubmitFeedback =
    feedbackType && feedbackSubject.trim() && feedbackMessage.trim() && !hasFeedbackUploading;

  const [searchQuery, setSearchQuery] = useState("");
  
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [showAiChat, setShowAiChat] = useState(false);
  const aiResponseRef = useRef<HTMLDivElement>(null);

  const askAIMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await apiRequest("POST", "/api/help/chat", { message: question });
      const data = await res.json();
      return data.response;
    },
    onSuccess: (response) => {
      setAiResponse(response);
      setShowAiChat(true);
      setTimeout(() => {
        aiResponseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "AI couldn't answer",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAskAI = () => {
    if (!searchQuery.trim()) return;
    setAiResponse(null);
    askAIMutation.mutate(searchQuery);
  };

  const isQuestionLike = (text: string) => {
    const questionIndicators = ["?", "how ", "what ", "why ", "where ", "when ", "can i ", "how do ", "help me ", "explain ", "tell me "];
    const lower = text.toLowerCase();
    return questionIndicators.some(q => lower.includes(q));
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

  const marketingMaterialsFeatures: HelpItem[] = [
    {
      title: "Marketing Flyer Library",
      description: "Access 26+ professional marketing flyers for different industries - liquor stores, restaurants, automotive, veterinarians, salons, and more.",
      link: "/marketing",
      icon: <LayoutGrid className="w-5 h-5 text-orange-600" />,
    },
    {
      title: "AI-Generated Flyers",
      description: "Create custom marketing flyers using AI. Describe your target business and let AI generate personalized copy and hero images.",
      link: "/marketing",
      icon: <Wand2 className="w-5 h-5 text-orange-600" />,
    },
    {
      title: "Save to Library",
      description: "Save your AI-generated flyers to your personal library for future use. Build a collection of proven marketing materials.",
      link: "/marketing",
      icon: <Download className="w-5 h-5 text-orange-600" />,
    },
    {
      title: "Email Copy Generator",
      description: "Get pre-written email body text to accompany your flyers. Just copy, paste into your email, and attach the flyer.",
      link: "/marketing",
      icon: <Mail className="w-5 h-5 text-orange-600" />,
    },
    {
      title: "Industry Filters",
      description: "Filter flyers by industry to quickly find the right material for your prospect. Search by name or browse by category.",
      link: "/marketing",
      icon: <Search className="w-5 h-5 text-orange-600" />,
    },
  ];

  const prospectingFeatures: HelpItem[] = [
    {
      title: "AI Prospect Finder",
      description: "Search for local businesses in your area using AI-powered web search. Filter by business type (MCC codes) to find merchants who need better payment processing.",
      link: "/prospects/search",
      icon: <Search className="w-5 h-5 text-blue-600" />,
    },
    {
      title: "Business Card Scanner",
      description: "Snap a photo of any business card to instantly add a prospect. AI extracts the name, phone, email, address, and business type automatically.",
      link: "/prospects/scan-card",
      icon: <Camera className="w-5 h-5 text-blue-600" />,
    },
    {
      title: "My Pipeline",
      description: "Track and manage all your claimed prospects in one place. See their status, contact info, and take quick actions like calling or getting directions.",
      link: "/prospects/pipeline",
      icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
    },
    {
      title: "Claim Prospects",
      description: "Found a great prospect? Claim them as your lead to prevent other agents from contacting them. Claimed prospects appear in your personal pipeline.",
      link: "/prospects/search",
      icon: <Target className="w-5 h-5 text-blue-600" />,
    },
    {
      title: "Maps & Directions",
      description: "Tap the location icon on any prospect to get driving directions in Google Maps. Plan efficient routes to visit multiple prospects in one trip.",
      link: "/prospects/pipeline",
      icon: <Navigation className="w-5 h-5 text-blue-600" />,
    },
    {
      title: "One-Tap Calling",
      description: "Tap the phone icon to instantly call any prospect. No need to copy numbers - just tap and call directly from the app.",
      link: "/prospects/pipeline",
      icon: <Smartphone className="w-5 h-5 text-blue-600" />,
    },
    {
      title: "Sales Spark (AI Coach)",
      description: "Stuck on who to call? Get instant, actionable prospecting ideas tailored to payment processing sales. Use voice dictation and listen to advice read aloud.",
      link: "/",
      icon: <Lightbulb className="w-5 h-5 text-amber-600" />,
    },
  ];

  const dealPipelineFeatures: HelpItem[] = [
    {
      title: "14-Stage Sales Pipeline",
      description: "Track deals through every stage: Prospect, Cold Call, Appointment Set, Presentation, Proposal, Statement Analysis, Negotiating, Follow-Up, Docs Sent, Signed, Won/Lost, Install, and Active Merchant.",
      link: "/prospects/pipeline",
      icon: <TrendingUp className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Swipe to Advance",
      description: "On mobile, swipe left on any deal card to quickly advance it to the next stage. The intuitive gesture makes stage management fast and easy.",
      link: "/prospects/pipeline",
      icon: <ChevronRight className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Temperature Badges",
      description: "Classify deals as Hot, Warm, or Cold. Temperature badges help you prioritize which deals need immediate attention and which can wait.",
      link: "/prospects/pipeline",
      icon: <Flame className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Follow-Up Tracking",
      description: "Track up to 5 follow-up attempts per deal with outcomes and methods. Schedule next follow-ups with quick presets (tomorrow, 3 days, 1 week, 2 weeks).",
      link: "/prospects/pipeline",
      icon: <Clock className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Voice Notes for Deals",
      description: "Record voice notes directly on deal follow-ups. AI transcribes your notes so you can capture details hands-free while driving or in meetings.",
      link: "/prospects/pipeline",
      icon: <Mic className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Loss Reason Tracking",
      description: "When a deal is lost, record why: competitor, price, timing, etc. This data helps identify patterns and improve your closing strategy.",
      link: "/prospects/pipeline",
      icon: <AlertCircle className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Phase Filters",
      description: "Filter your pipeline by phase: Prospecting, Active Selling, Closing, or Post-Sale. Focus on the stage of the sales cycle that needs attention.",
      link: "/prospects/pipeline",
      icon: <ClipboardList className="w-5 h-5 text-green-600" />,
    },
    {
      title: "List & Kanban Views",
      description: "Toggle between list view (scrollable cards) and kanban board (columns by stage). Use the view that works best for your workflow.",
      link: "/prospects/pipeline",
      icon: <LayoutGrid className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Quick Actions",
      description: "Call, email, or get directions to any deal with one tap. Contact info and business address are always at your fingertips.",
      link: "/prospects/pipeline",
      icon: <Smartphone className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Pipeline Analytics",
      description: "See total deals, pipeline value, and win rate at a glance. Track your sales performance and forecast commissions.",
      link: "/prospects/pipeline",
      icon: <BarChart3 className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Convert to Active Merchant",
      description: "When a deal closes, convert it to an Active Merchant with one click. All business data carries over for ongoing relationship management.",
      link: "/prospects/pipeline",
      icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
    },
    {
      title: "Quarterly Check-ins",
      description: "For active merchants, schedule and track quarterly check-ins. Stay in touch and identify upsell opportunities with your existing customers.",
      link: "/prospects/pipeline",
      icon: <Calendar className="w-5 h-5 text-green-600" />,
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

  const equipIQFeatures: HelpItem[] = [
    {
      title: "AI Equipment Advisor",
      description: "Chat with AI to get personalized equipment recommendations based on merchant needs. Describe the business and get instant suggestions.",
      link: "/equipiq",
      icon: <Brain className="w-5 h-5 text-primary" />,
    },
    {
      title: "Product Catalog",
      description: "Browse 63+ payment products from 6 vendors: SwipeSimple, Dejavoo, MX POS, Hot Sauce POS, Valor PayTech, and FluidPay.",
      link: "/equipiq",
      icon: <Package className="w-5 h-5 text-primary" />,
    },
    {
      title: "Filter by Vendor",
      description: "Quickly narrow down products by selecting a specific vendor. Compare features and find the right fit.",
      link: "/equipiq",
      icon: <Search className="w-5 h-5 text-primary" />,
    },
    {
      title: "Product Details",
      description: "View complete product information including features, pricing, and best-use scenarios for each device.",
      link: "/equipiq",
      icon: <FileText className="w-5 h-5 text-primary" />,
    },
    {
      title: "Training Quizzes",
      description: "Test your product knowledge with AI-generated quizzes. Choose difficulty: Beginner, Intermediate, or Advanced.",
      link: "/equipiq",
      icon: <Target className="w-5 h-5 text-primary" />,
    },
    {
      title: "Track Progress",
      description: "View your quiz results and track improvement over time. Identify areas where you need more practice.",
      link: "/equipiq",
      icon: <TrendingUp className="w-5 h-5 text-primary" />,
    },
  ];

  const dailyEdgeFeatures: HelpItem[] = [
    {
      title: "Daily Motivation",
      description: "Start each day with focused content from The Salesperson's Secret Code. Build the mindset habits of top performers.",
      link: "/coach",
      icon: <Zap className="w-5 h-5 text-amber-500" />,
    },
    {
      title: "5 Destination Beliefs",
      description: "Master the 5 beliefs that set elite salespeople apart: Fulfilment, Control, Resilience, Influence, and Communication.",
      link: "/coach",
      icon: <Target className="w-5 h-5 text-amber-500" />,
    },
    {
      title: "Daily Content Types",
      description: "Each day brings fresh content: inspiring quotes, key insights, practical challenges, iconic stories, and journey motivators.",
      link: "/coach",
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
    },
    {
      title: "Discuss with AI",
      description: "Tap 'Discuss This with AI Coach' to explore the day's content deeper. Ask questions and learn how to apply principles to real situations.",
      link: "/coach",
      icon: <MessageSquare className="w-5 h-5 text-amber-500" />,
    },
    {
      title: "Streak Tracking",
      description: "Build momentum with daily engagement streaks. See your progress and stay consistent in developing winning habits.",
      link: "/coach",
      icon: <Activity className="w-5 h-5 text-amber-500" />,
    },
    {
      title: "Belief Progress",
      description: "Track your growth across all 5 Destination Beliefs with visual progress rings. See which areas need more focus.",
      link: "/coach",
      icon: <BarChart3 className="w-5 h-5 text-amber-500" />,
    },
  ];

  const esignFeatures: HelpItem[] = [
    {
      title: "E-Signature Library",
      description: "Access all merchant applications, equipment agreements, and compliance documents. Click any template to start a new signature request.",
      link: "/esign",
      icon: <FileSignature className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: "Send for Signature",
      description: "Add signers with their email addresses, then send documents via SignNow. Merchants receive professional email invitations to sign.",
      link: "/esign",
      icon: <Send className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: "Track Signatures",
      description: "Monitor signature status in real-time: Draft, Sent, Viewed, Signed, or Declined. Get notified when documents are completed.",
      link: "/esign",
      icon: <Eye className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: "Auto-Fill Fields",
      description: "Merchant information auto-populates into document fields. Less typing means faster processing and fewer errors.",
      link: "/esign",
      icon: <Zap className="w-5 h-5 text-emerald-600" />,
    },
  ];

  const proposalFeatures: HelpItem[] = [
    {
      title: "Generate Proposals",
      description: "Upload pricing PDFs (Dual Pricing or Interchange Plus), and AI extracts rates, fees, and savings to create professional proposals.",
      link: "/coach",
      icon: <FileText className="w-5 h-5 text-violet-600" />,
    },
    {
      title: "Equipment Selection",
      description: "Choose from 63+ products across 6 vendors. Search and filter by category to find the perfect equipment for each merchant.",
      link: "/coach",
      icon: <Package className="w-5 h-5 text-violet-600" />,
    },
    {
      title: "One-Page PDF Output",
      description: "Generate branded, professional proposals with savings breakdown, equipment pricing, and agent contact info.",
      link: "/coach",
      icon: <Download className="w-5 h-5 text-violet-600" />,
    },
  ];

  const statementAnalyzerFeatures: HelpItem[] = [
    {
      title: "Upload Statements",
      description: "Upload merchant processing statements (PDF, images, Excel/CSV). AI automatically extracts all the key data - volumes, rates, fees, and more.",
      link: "/coach",
      icon: <Upload className="w-5 h-5 text-rose-600" />,
    },
    {
      title: "AI Data Extraction",
      description: "Gemini AI reads statements and pulls out card volumes, effective rates, monthly fees, and processor markup. No manual data entry needed.",
      link: "/coach",
      icon: <Brain className="w-5 h-5 text-rose-600" />,
    },
    {
      title: "Configure Pricing",
      description: "Set your pricing before analysis: Dual Pricing monthly fee, IC+ markup rates, or Surcharge percentages. AI calculates savings with your rates.",
      link: "/coach",
      icon: <DollarSign className="w-5 h-5 text-rose-600" />,
    },
    {
      title: "Red Flag Detection",
      description: "AI identifies issues: high effective rates, hidden fees, expensive equipment leases, and PCI compliance charges. Know what to pitch against.",
      link: "/coach",
      icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
    },
    {
      title: "Competitor Insights",
      description: "Get talking points for Square, Stripe, Clover, Heartland, Worldpay, and First Data. Know each processor's weaknesses.",
      link: "/coach",
      icon: <Target className="w-5 h-5 text-rose-600" />,
    },
    {
      title: "Sales Scripts",
      description: "Get ready-to-use scripts: opening statements, discovery questions, objection handlers with expandable responses, and closing statements.",
      link: "/coach",
      icon: <MessageSquare className="w-5 h-5 text-rose-600" />,
    },
    {
      title: "Export Options",
      description: "Copy for email/CRM, export to Excel (multi-sheet), save as PDF, or generate Word documents for agents or merchants.",
      link: "/coach",
      icon: <FileDown className="w-5 h-5 text-rose-600" />,
    },
    {
      title: "Self-Improving AI",
      description: "The system learns from past extractions. Mark results as 'Looks Good' or report issues - AI uses feedback to improve future accuracy.",
      link: "/coach",
      icon: <Sparkles className="w-5 h-5 text-rose-600" />,
    },
  ];

  const presentationFeatures: HelpItem[] = [
    {
      title: "8 Training Modules",
      description: "Master the PCBancard Dual Pricing presentation with structured lessons covering the complete sales process.",
      link: "/coach",
      icon: <GraduationCap className="w-5 h-5 text-teal-600" />,
    },
    {
      title: "25 Interactive Lessons",
      description: "Learn persuasion psychology: anchoring, loss aversion, social proof, story proof techniques, and closing strategies.",
      link: "/coach",
      icon: <Lightbulb className="w-5 h-5 text-teal-600" />,
    },
    {
      title: "Voice Dictation Support",
      description: "Practice speaking your pitch with voice input. AI provides feedback on your delivery and content.",
      link: "/coach",
      icon: <Mic className="w-5 h-5 text-teal-600" />,
    },
    {
      title: "Quizzes & Progress Tracking",
      description: "Test your knowledge with module quizzes. Track completion progress and earn achievements.",
      link: "/coach",
      icon: <Target className="w-5 h-5 text-teal-600" />,
    },
  ];

  const interactiveTrainingFeatures: HelpItem[] = [
    {
      title: "Live Roleplay Simulator",
      description: "Practice with 20 AI merchant personas. Each has unique personalities, objection styles, and weak points to discover.",
      link: "/interactive-training",
      icon: <Users className="w-5 h-5 text-purple-600" />,
    },
    {
      title: "Objection Gauntlet",
      description: "Handle 12 rapid-fire objections back-to-back. Learn the best responses and key principles for each challenge.",
      link: "/interactive-training",
      icon: <Target className="w-5 h-5 text-orange-600" />,
    },
    {
      title: "Scenario Trainer",
      description: '"What would you do?" situational training. Make decisions and get immediate feedback on your choices.',
      link: "/interactive-training",
      icon: <MessageSquare className="w-5 h-5 text-cyan-600" />,
    },
    {
      title: "Delivery Analyzer",
      description: "Practice your full presentation. AI detects which stages you hit and coaches your delivery in real-time.",
      link: "/interactive-training",
      icon: <BarChart3 className="w-5 h-5 text-purple-600" />,
    },
    {
      title: "Voice Input & Playback",
      description: "Speak your responses with the microphone and listen to AI feedback with ElevenLabs text-to-speech.",
      link: "/interactive-training",
      icon: <Mic className="w-5 h-5 text-primary" />,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-help-menu">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                data-testid="menu-item-send-feedback"
                onClick={() => setFeedbackOpen(true)}
              >
                <MessageSquarePlus className="w-4 h-4 mr-2" />
                Send Feedback
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Sheet open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={
            isMobile
              ? "max-h-[85vh] overflow-y-auto rounded-t-lg"
              : "w-full sm:max-w-md overflow-y-auto"
          }
        >
          <SheetHeader>
            <SheetTitle>Send Feedback</SheetTitle>
            <SheetDescription>
              Let us know how we can improve your experience.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 mt-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Type</label>
              <Select value={feedbackType} onValueChange={setFeedbackType}>
                <SelectTrigger data-testid="select-feedback-type">
                  <SelectValue placeholder="Select feedback type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature_suggestion">Feature Suggestion</SelectItem>
                  <SelectItem value="bug_report">Bug Report</SelectItem>
                  <SelectItem value="help_request">Help Request</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Subject</label>
              <Input
                data-testid="input-feedback-subject"
                placeholder="Brief summary"
                value={feedbackSubject}
                onChange={(e) => setFeedbackSubject(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Message</label>
              <Textarea
                data-testid="textarea-feedback-message"
                placeholder="Describe your feedback in detail..."
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Attachments</label>
              <div
                data-testid="dropzone-feedback-files"
                onDrop={handleFeedbackDrop}
                onDragOver={handleFeedbackDragOver}
                onDragLeave={handleFeedbackDragLeave}
                onClick={() => feedbackFileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 cursor-pointer transition-colors ${
                  isFeedbackDragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25"
                }`}
              >
                <Upload className="w-6 h-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-muted-foreground">
                  Images or PDF, max 10MB each, up to {FEEDBACK_MAX_FILES} files
                </p>
              </div>
              <input
                ref={feedbackFileInputRef}
                type="file"
                className="hidden"
                multiple
                accept={FEEDBACK_ACCEPTED_TYPES.join(",")}
                onChange={(e) => {
                  if (e.target.files) handleFeedbackFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {feedbackFiles.length > 0 && (
              <div className="flex flex-col gap-2">
                {feedbackFiles.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-md border p-2"
                  >
                    <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center">
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.file.name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(item.file.size)}
                        </span>
                        {item.status === "uploading" && (
                          <Badge variant="secondary" className="text-xs">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Uploading
                          </Badge>
                        )}
                        {item.status === "done" && (
                          <Badge variant="secondary" className="text-xs">
                            Uploaded
                          </Badge>
                        )}
                        {item.status === "error" && (
                          <Badge variant="destructive" className="text-xs">
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFeedbackFile(item.id)}
                      aria-label={`Remove ${item.file.name}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button
              data-testid="button-submit-feedback"
              onClick={() => feedbackSubmitMutation.mutate()}
              disabled={!canSubmitFeedback || feedbackSubmitMutation.isPending}
              className="w-full"
            >
              {feedbackSubmitMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Submit Feedback
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <main className="p-4 space-y-8 max-w-2xl mx-auto">
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold text-primary">BrochureTracker Help</h1>
          <p className="text-muted-foreground mt-2">
            Complete guide to all features and how to use them
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search topics or ask a question..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value) {
                  setShowAiChat(false);
                  setAiResponse(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isQuestionLike(searchQuery)) {
                  handleAskAI();
                }
              }}
              className="pl-10 pr-10"
              data-testid="input-help-search"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => {
                  setSearchQuery("");
                  setShowAiChat(false);
                  setAiResponse(null);
                }}
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {searchQuery && (
            <Button
              onClick={handleAskAI}
              disabled={askAIMutation.isPending}
              className="w-full"
              variant={isQuestionLike(searchQuery) ? "default" : "outline"}
              data-testid="button-ask-ai"
            >
              {askAIMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Ask AI: "{searchQuery.length > 30 ? searchQuery.substring(0, 30) + "..." : searchQuery}"
                </>
              )}
            </Button>
          )}
        </div>

        {showAiChat && aiResponse && (
          <Card ref={aiResponseRef} className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                AI Answer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm">{aiResponse}</div>
              </div>
              <div className="mt-4 pt-3 border-t flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAiChat(false);
                    setAiResponse(null);
                    setSearchQuery("");
                  }}
                  data-testid="button-clear-ai-response"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(aiResponse);
                    toast({ title: "Copied to clipboard" });
                  }}
                  data-testid="button-copy-ai-response"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!searchQuery && (() => {
          const quickLinks = [
            { label: "Deal Pipeline", searchTerm: "pipeline", icon: <TrendingUp className="w-3 h-3 mr-1" />, testId: "quicklink-pipeline", requiredFeature: "deal_pipeline" },
            { label: "Statement Analyzer", searchTerm: "statement", icon: <FileSpreadsheet className="w-3 h-3 mr-1" />, testId: "quicklink-statement", requiredFeature: "statement_analyzer" },
            { label: "Proposals", searchTerm: "proposal", icon: <FileText className="w-3 h-3 mr-1" />, testId: "quicklink-proposal", requiredFeature: "proposal_generator" },
            { label: "E-Signatures", searchTerm: "e-sign", icon: <FileSignature className="w-3 h-3 mr-1" />, testId: "quicklink-esign", requiredFeature: "esign_integration" },
            { label: "AI Coach", searchTerm: "coach", icon: <Brain className="w-3 h-3 mr-1" />, testId: "quicklink-coach", requiredFeature: "ai_coaching" },
            { label: "EquipIQ", searchTerm: "equipiq", icon: <Package className="w-3 h-3 mr-1" />, testId: "quicklink-equipiq", requiredFeature: "equipiq" },
            { label: "Drops", searchTerm: "drop", icon: <ClipboardList className="w-3 h-3 mr-1" />, testId: "quicklink-drops", requiredFeature: "drop_management" },
            { label: "Offline Mode", searchTerm: "offline", icon: <WifiOff className="w-3 h-3 mr-1" />, testId: "quicklink-offline", requiredFeature: undefined },
            { label: "Training", searchTerm: "presentation", icon: <GraduationCap className="w-3 h-3 mr-1" />, testId: "quicklink-training", requiredFeature: "presentation_training" },
          ];
          
          const filteredQuickLinks = quickLinks.filter(link => 
            !link.requiredFeature || hasFeature(link.requiredFeature)
          );
          
          if (filteredQuickLinks.length === 0) return null;
          
          return (
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-primary" />
                  Quick Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {filteredQuickLinks.map((link) => (
                    <Button 
                      key={link.testId}
                      variant="secondary" 
                      size="sm"
                      onClick={() => setSearchQuery(link.searchTerm)}
                      data-testid={link.testId}
                    >
                      {link.icon}
                      {link.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {(() => {
          const query = searchQuery.toLowerCase().trim();
          
          const allSections: HelpSectionData[] = [
            { title: "Getting Started", description: "New to BrochureTracker? Start here to get up and running quickly.", items: gettingStartedItems, badge: "New Users" },
            { title: "Navigation & Core Features", description: "The main features you'll use every day as a field sales representative.", items: agentFeatures, badge: "All Users" },
            { title: "Drop Management", description: "Everything you need to know about logging and managing brochure drops.", items: dropFeatures, badge: "All Users", requiredFeature: "drop_management" },
            { title: "AI-Powered Tools", description: "Smart features that help you work faster and communicate more effectively.", items: aiToolsFeatures, badge: "All Users", requiredFeature: "ai_coaching" },
            { title: "Marketing Materials", description: "Professional flyers and AI-generated marketing content for every industry.", items: marketingMaterialsFeatures, badge: "New", requiredFeature: "marketing_materials" },
            { title: "AI-Powered Prospecting", description: "Find new merchants with AI search, scan business cards, and build your sales pipeline.", items: prospectingFeatures, badge: "New", requiredFeature: "ai_prospect_finder" },
            { title: "Deal Pipeline & CRM", description: "Track every deal through a 14-stage sales pipeline with follow-up tracking, temperature badges, and conversion analytics.", items: dealPipelineFeatures, badge: "CRM", requiredFeature: "deal_pipeline" },
            { title: "EquipIQ - Equipment Knowledge", description: "AI-powered equipment recommendations, product catalog, and training quizzes to master payment solutions.", items: equipIQFeatures, badge: "All Users", requiredFeature: "equipiq" },
            { title: "Daily Edge - Mindset Training", description: "Build the winning mindset of top performers with daily motivational content and AI coaching.", items: dailyEdgeFeatures, badge: "All Users", requiredFeature: "daily_edge" },
            { title: "E-Signature Documents", description: "Send merchant applications and agreements for electronic signature via SignNow.", items: esignFeatures, badge: "All Users", requiredFeature: "esign_integration" },
            { title: "Statement Analyzer", description: "Upload merchant statements, extract data with AI, identify savings opportunities, and generate sales scripts.", items: statementAnalyzerFeatures, badge: "Sales Tool", requiredFeature: "statement_analyzer" },
            { title: "Proposal Generator", description: "Create professional branded proposals from pricing PDFs with equipment recommendations.", items: proposalFeatures, badge: "All Users", requiredFeature: "proposal_generator" },
            { title: "Presentation Training", description: "Master the PCBancard Dual Pricing presentation with interactive lessons and practice scenarios.", items: presentationFeatures, badge: "All Users", requiredFeature: "presentation_training" },
            { title: "Interactive AI Training", description: "AI-powered sales training with live roleplay, objection handling, scenario decisions, and delivery analysis with voice I/O.", items: interactiveTrainingFeatures, badge: "AI Powered", requiredFeature: "interactive_ai_training" },
            { title: "Offline & Mobile", description: "BrochureTracker is designed for the field - works offline and installs like a native app.", items: offlineFeatures, badge: "All Users" },
            { title: "Merchant Profiles", description: "Build comprehensive profiles of every merchant you visit. Track history, notes, and conversion likelihood.", items: merchantFeatures, badge: "All Users", requiredFeature: "merchant_profiles" },
            { title: "Inventory Tracking", description: "Keep track of your brochure inventory so you never run out in the field.", items: inventoryFeatures, badge: "All Users", requiredFeature: "brochure_inventory" },
            { title: "Referral Tracking", description: "Log and track referrals from existing merchants to grow your network.", items: referralFeatures, badge: "All Users", requiredFeature: "referral_tracking" },
            { title: "Team Activity Feed", description: "Stay connected with your team and celebrate wins together.", items: activityFeatures, badge: "All Users", requiredFeature: "activity_feed" },
            { title: "Route Optimizer", description: "Plan the most efficient driving routes for your daily pickups.", items: routeFeatures, badge: "All Users", requiredFeature: "route_planner" },
            { title: "Follow-up Sequences", description: "Automate your follow-up process with pre-built email sequences.", items: sequenceFeatures, badge: "All Users" },
            { title: "Smart Location Reminders", description: "Get notified when you're near merchants with pending pickups.", items: locationReminderFeatures, badge: "All Users" },
          ];

          const permissionFilteredSections = allSections.filter(section => {
            if (!section.requiredFeature) return true;
            return hasFeature(section.requiredFeature);
          });

          const filteredSections = query
            ? permissionFilteredSections.map(section => {
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
            : permissionFilteredSections;

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
              <AccordionItem value="item-17">
                <AccordionTrigger className="text-sm">How do I analyze a merchant's processing statement?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Go to Coach {">"} Statement Analyzer. Upload the merchant's statement (PDF, image, or Excel file). AI extracts volumes, rates, and fees automatically. Configure your pricing, then click Analyze to see savings, red flags, and get ready-to-use sales scripts.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-18">
                <AccordionTrigger className="text-sm">What file types can Statement Analyzer handle?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Statement Analyzer accepts <strong>PDF</strong> files, <strong>images</strong> (JPG, PNG), and <strong>Excel/CSV</strong> files. For best results, upload clear, readable PDFs. If the merchant only has paper statements, take a photo - AI can read images too.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-19">
                <AccordionTrigger className="text-sm">How do I send documents for e-signature?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Go to E-Sign Documents from the Coach page. Select a template (application, agreement, etc.), add signer emails, and click Send. SignNow emails the merchant a secure link. Track status in real-time: Sent, Viewed, Signed, or Declined.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-20">
                <AccordionTrigger className="text-sm">How do I create a professional proposal?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Use the Proposal Generator from the Coach page. Upload pricing PDFs, select equipment from the catalog, and choose your output format: Claude AI (professional write-up), Replit Native (fast PDF/Word), or Gamma (AI-designed presentation). Get branded proposals in seconds.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-21">
                <AccordionTrigger className="text-sm">What are the export options in Statement Analyzer?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  <strong>Copy for Email:</strong> Plain text for pasting into email/CRM.<br/>
                  <strong>Export to Excel:</strong> Multi-sheet workbook with analysis, issues, and scripts.<br/>
                  <strong>Save as PDF:</strong> Print-ready document.<br/>
                  <strong>Agent Word:</strong> Full analysis for your records.<br/>
                  <strong>Merchant Word:</strong> Clean version to share with merchants.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-22">
                <AccordionTrigger className="text-sm">How does the AI learning system improve over time?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  When Statement Analyzer extracts data, you can mark it "Looks Good" (correct) or "Report Issue" (needs fixing). Your feedback trains the AI. Over time, it recognizes processor formats better and makes fewer mistakes. Past extractions help improve future ones.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-23">
                <AccordionTrigger className="text-sm">Can I set my own pricing for savings calculations?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes! Before analyzing a statement, expand the Pricing Configuration panel. Set your Dual Pricing monthly fee, IC+ markup, Surcharge rate, or use Quick Presets (Standard, Aggressive, Premium). AI uses your rates to calculate potential savings.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-24">
                <AccordionTrigger className="text-sm">How do I use the Deal Pipeline?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Go to the Deal Pipeline from the Dashboard. Create new deals by tapping the + button, then track them through 14 stages from Prospect to Active Merchant. Use swipe gestures on mobile to quickly advance deals to the next stage.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-25">
                <AccordionTrigger className="text-sm">What are the 14 pipeline stages?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  <strong>Prospecting:</strong> Prospect, Cold Call, Appointment Set.<br/>
                  <strong>Active Selling:</strong> Presentation Made, Proposal Sent, Statement Analysis, Negotiating, Follow-Up.<br/>
                  <strong>Closing:</strong> Documents Sent, Documents Signed, Won, Lost.<br/>
                  <strong>Post-Sale:</strong> Installation Scheduled, Active Merchant.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-26">
                <AccordionTrigger className="text-sm">How do I track follow-ups on a deal?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Open a deal and tap "Record Follow-Up". Choose the method (call, text, email, in-person) and outcome (scheduled meeting, left voicemail, etc.). Schedule your next follow-up with quick presets like "tomorrow" or "in 1 week". Track up to 5 attempts per deal.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-27">
                <AccordionTrigger className="text-sm">What are temperature badges?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Temperature badges (Hot, Warm, Cold) help you prioritize deals. <strong>Hot</strong> = urgent, likely to close soon. <strong>Warm</strong> = interested but not urgent. <strong>Cold</strong> = needs nurturing. Set the temperature when creating or editing a deal.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-28">
                <AccordionTrigger className="text-sm">How do I convert a won deal to an active merchant?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  When a deal moves to the "Active Merchant" stage, tap "Convert to Merchant" in the deal details. This creates a full merchant profile with all the business info, ready for ongoing relationship management and quarterly check-ins.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-29">
                <AccordionTrigger className="text-sm">What is Sales Spark and how do I use it?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Sales Spark is your AI prospecting coach on the Dashboard. Tap to expand it, then type or dictate what's on your mind (e.g., "I don't know who to call today"). Tap <strong>Spark My Day</strong> to get specific, actionable prospecting ideas tailored to payment processing sales. Toggle "Read aloud" to hear the advice spoken back to you.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Pro Tips
            </CardTitle>
            <CardDescription>
              Power-user shortcuts to work faster
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">Quick Statement Analysis</p>
                <p className="text-muted-foreground">Set up your pricing presets once, then use "Upload & Analyze" to extract data and calculate savings in one step.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Copy className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">Copy Sales Scripts</p>
                <p className="text-muted-foreground">After analyzing a statement, use "Copy for Email" to quickly paste talking points into your email or CRM notes.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Mic className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">Voice-First Workflow</p>
                <p className="text-muted-foreground">Use voice notes in drops and voice chat in AI Coach. It's faster than typing and captures more details.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Calculator className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">Customize Pricing</p>
                <p className="text-muted-foreground">Use "Aggressive" pricing preset to show maximum savings, or set your own rates to match your actual offering.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Brain className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">AI Coach Before Calls</p>
                <p className="text-muted-foreground">Do a quick role-play before important meetings. Practice objection handling for the specific merchant type.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">Daily Edge + Coffee</p>
                <p className="text-muted-foreground">Start each morning with Daily Edge content. 5 minutes of mindset training compounds into major sales performance gains.</p>
              </div>
            </div>
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
              Have a feature idea, bug report, or need help?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use the menu at the top of this page to submit feedback, report bugs, or request help. You can also attach screenshots and files to help us understand your feedback better.
            </p>
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
