import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  QrCode, MapPin, Mic, Bell, CheckCircle2, ArrowRight, Package, GraduationCap, 
  Users, TrendingUp, FileSignature, Brain, Presentation, Cpu, Sparkles, Store,
  Search, Camera, Navigation, Globe, FileImage, Mail, Download, Palette
} from "lucide-react";
import pcbLogoFullColor from "@/assets/pcb_logo_fullcolor.png";
import pcbLogoLight from "@/assets/pcb_logo_light.png";

const coreFeatures = [
  {
    icon: QrCode,
    title: "Brochure Tracking",
    description: "Scan QR codes to track video brochure deployments with GPS and voice notes",
  },
  {
    icon: Store,
    title: "Merchant Profiles",
    description: "Build comprehensive merchant dossiers with visit history and AI lead scoring",
  },
  {
    icon: Users,
    title: "Referral Management",
    description: "Track merchant referrals from first contact through conversion",
  },
  {
    icon: Package,
    title: "Inventory Control",
    description: "Full chain of custody tracking with low-stock alerts and transfers",
  },
];

const prospectingFeatures = [
  {
    icon: Search,
    title: "AI Prospect Finder",
    description: "Discover local businesses using AI-powered web search with MCC code filtering",
  },
  {
    icon: Camera,
    title: "Business Card Scanner",
    description: "Snap a photo of any business card to instantly add prospects with AI OCR",
  },
  {
    icon: Navigation,
    title: "Maps Integration",
    description: "Get directions to prospects and make calls with one tap from your pipeline",
  },
  {
    icon: Globe,
    title: "Territory Builder",
    description: "Build and manage your sales pipeline with claim tracking and follow-ups",
  },
];

const aiFeatures = [
  {
    icon: Brain,
    title: "AI Sales Coach",
    description: "Practice role-plays with 7 merchant personas and get real-time coaching feedback",
  },
  {
    icon: Presentation,
    title: "Presentation Training",
    description: "Master the PCBancard pitch with 25 lessons on persuasion and objection handling",
  },
  {
    icon: Cpu,
    title: "EquipIQ",
    description: "AI equipment advisor with 63+ products across 6 vendors and training quizzes",
  },
  {
    icon: Sparkles,
    title: "Daily Edge",
    description: "Daily mindset training with motivational content and streak tracking",
  },
];

const businessTools = [
  {
    icon: FileSignature,
    title: "E-Signature",
    description: "Send merchant applications for electronic signature with SignNow integration",
  },
  {
    icon: TrendingUp,
    title: "Proposal Generator",
    description: "Create branded proposals from pricing PDFs with equipment recommendations",
  },
  {
    icon: Mic,
    title: "Meeting Recorder",
    description: "Record sales conversations with AI transcription and coaching analysis",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Automated pickup reminders and follow-up notifications",
  },
];

const marketingFeatures = [
  {
    icon: FileImage,
    title: "Industry Flyers",
    description: "12 professionally designed flyers for liquor stores, restaurants, automotive, and more",
  },
  {
    icon: Download,
    title: "Instant Download",
    description: "Download high-quality PDFs ready to print or share digitally with prospects",
  },
  {
    icon: Mail,
    title: "Email Templates",
    description: "Pre-written email copy with your contact info to share flyers with prospects",
  },
  {
    icon: Palette,
    title: "PCBancard Branding",
    description: "Professional branded materials featuring dual pricing benefits for each industry",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src={pcbLogoFullColor} 
              alt="PCBancard" 
              className="h-8 w-auto"
            />
          </div>
          <a href="/api/login">
            <Button className="min-h-touch" data-testid="button-login-header">
              Log In
            </Button>
          </a>
        </div>
      </header>

      <main className="container max-w-md md:max-w-2xl lg:max-w-5xl mx-auto px-4 py-8">
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <CheckCircle2 className="w-4 h-4" />
            Your Complete Field Sales Platform
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Field Sales
            <span className="block text-primary">Intelligence Suite</span>
          </h1>
          
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Track brochures, manage merchants, train with AI coaching, send e-signatures, and close more deals — all from your mobile device.
          </p>
          
          <a href="/api/login">
            <Button size="lg" className="w-full md:w-auto min-h-touch-lg gap-2 px-8" data-testid="button-get-started">
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Button>
          </a>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-center mb-2">Core Field Operations</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">Track deployments, manage merchants, and build your territory</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {coreFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-4 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </Card>
            );
          })}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-center mb-2">AI-Powered Prospecting</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">Find new merchants and build your pipeline faster</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {prospectingFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-4 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </Card>
            );
          })}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-center mb-2">AI-Powered Training</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">Master your pitch with personalized AI coaching</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {aiFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-4 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </Card>
            );
          })}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-center mb-2">Business Tools</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">Streamline your sales workflow from pitch to close</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {businessTools.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-4 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </Card>
            );
          })}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-center mb-2">AI-Powered Marketing</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">Professional materials to share with your prospects</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {marketingFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-4 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </Card>
            );
          })}
          </div>
        </section>

        <section className="text-center py-8 border-t border-border">
          <p className="text-lg font-medium mb-2">Ready to boost your sales performance?</p>
          <p className="text-sm text-muted-foreground mb-6">
            Join PCBancard field representatives using the most comprehensive sales platform
          </p>
          <a href="/api/login">
            <Button variant="outline" className="w-full md:w-auto min-h-touch gap-2 px-8" data-testid="button-login-bottom">
              Log In to Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </a>
        </section>
      </main>

      <footer className="border-t border-border py-6 mt-8">
        <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 text-center">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground mb-4">
            <a href="/legal/privacy-policy.html" className="hover:text-foreground">Privacy Policy</a>
            <a href="/legal/terms-of-service.html" className="hover:text-foreground">Terms of Service</a>
            <a href="/legal/cookie-policy.html" className="hover:text-foreground">Cookie Policy</a>
            <a href="/legal/accessibility-statement.html" className="hover:text-foreground">Accessibility</a>
            <a href="/legal/copyright-dmca.html" className="hover:text-foreground">Copyright & DMCA</a>
            <a href="/legal/refunds-policy.html" className="hover:text-foreground">Refunds Policy</a>
          </div>
          <p className="text-xs text-muted-foreground">
            Copyright PCBancard. All Rights Reserved &copy;2026<br />
            <span className="text-[10px]">PCBancard LLC is a registered ISO of Synovus Bank, Columbus, GA.; a registered ISO of Fifth Third Bank, N.A., Cincinnati, OH.; a registered ISO of Wells Fargo Bank, N.A. Concord, CA,; and a registered ISO of Citizens Bank, N.A.</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
