import { useState } from "react";
import { useLocation } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Eye,
  EyeOff,
  Wrench,
  ClipboardCheck,
  CalendarDays,
  Users,
  CreditCard,
  BarChart3,
  MessageSquare,
  UserCog,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Search,
  DollarSign,
  BookOpen,
  Cog,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import pcbAutoLogo from "@assets/Untitled_design_1770609957209.png";
import featureRepairOrders from "@/assets/images/feature-repair-orders.png";
import featureDvi from "@/assets/images/feature-dvi.png";
import featureScheduling from "@/assets/images/feature-scheduling.png";
import featureCustomers from "@/assets/images/feature-customers.png";
import featurePayments from "@/assets/images/feature-payments.png";
import featureReports from "@/assets/images/feature-reports.png";
import featureStaff from "@/assets/images/feature-staff.png";
import featureCommunication from "@/assets/images/feature-communication.png";
import featureDualPricing from "@/assets/images/feature-dual-pricing.png";
import featureQuickbooks from "@/assets/images/feature-quickbooks.png";
import featurePartstech from "@/assets/images/feature-partstech.png";
import featureAiAssistant from "@/assets/images/feature-ai-assistant.png";
import deepDualPricing from "@/assets/images/deep-dual-pricing.png";
import deepDvi from "@/assets/images/deep-dvi.png";
import deepPartstech from "@/assets/images/deep-partstech.png";
import deepAiAssistant from "@/assets/images/deep-ai-assistant.png";
import { Check } from "lucide-react";

function QBSyncMockup() {
  return (
    <div className="rounded-xl shadow-2xl overflow-hidden bg-[#0f172a] text-white border border-white/10">
      <div className="flex items-start">
        <div className="w-1.5 bg-emerald-500 self-stretch flex-shrink-0" />
        <div className="flex-1 p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0">
              QB
            </div>
            <span className="font-bold text-emerald-400 text-lg">QuickBooks</span>
            <Badge variant="secondary" className="ml-auto bg-emerald-500/15 text-emerald-400 text-[10px] no-default-hover-elevate no-default-active-elevate">
              Connected
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "847", label: "Total Synced" },
              { value: "22", label: "This Week" },
              { value: "$38,420", label: "Revenue" },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-xl font-bold tabular-nums">{s.value}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sync Log</div>
            <div className="bg-white/5 rounded-lg overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-x-3 px-3 py-1.5 text-[10px] text-slate-500 font-semibold uppercase tracking-wider border-b border-white/5">
                <span>Status</span>
                <span>RO Number</span>
                <span>Customer</span>
                <span className="text-right">Amount</span>
              </div>
              {[
                { ro: "RO-1041", customer: "Acme Corp", amount: "$120.00", ok: true },
                { ro: "RO-1040", customer: "Doe Inc.", amount: "$5,400.00", ok: true },
                { ro: "RO-1039", customer: "Doe Inc.", amount: "$5,400.00", ok: false },
              ].map((row, i) => (
                <div key={i} className={`grid grid-cols-[auto_1fr_1fr_auto] gap-x-3 items-center px-3 py-2 text-xs ${i < 2 ? "border-b border-white/5" : ""}`}>
                  <span>
                    {row.ok ? (
                      <div className="w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-2 h-2 text-white" />
                      </div>
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                    )}
                  </span>
                  <span className="text-slate-400">{row.ro}</span>
                  <span className="text-slate-300">{row.customer}</span>
                  <span className="text-right tabular-nums text-slate-300">{row.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    title: "Repair Orders & Estimates",
    icon: Wrench,
    image: featureRepairOrders,
    description:
      "Build detailed estimates in minutes. Track every job from estimate to paid with a visual Kanban board.",
  },
  {
    title: "Dual Pricing \u2014 Cash & Card",
    icon: DollarSign,
    image: featureDualPricing,
    description:
      "Show your customers a cash price and a card price on every estimate, invoice, and receipt. Legal in all 50 states. Keep more margin.",
  },
  {
    title: "72-Point Digital Inspections",
    icon: ClipboardCheck,
    image: featureDvi,
    description:
      "Technicians complete inspections on a tablet with one-tap green/yellow/red scoring and camera photos. Customers get a visual report texted to their phone.",
  },
  {
    title: "Parts Ordering \u2014 PartsTech Built In",
    icon: Cog,
    image: featurePartstech,
    description:
      "Search 30,000+ supplier locations. See live inventory and pricing from O\u2019Reilly, NAPA, AutoZone, and more. Parts drop onto the RO with your markup applied.",
  },
  {
    title: "Scheduling & Bay Management",
    icon: CalendarDays,
    image: featureScheduling,
    description:
      "Visual calendar with bay rows. Drag and drop appointments. Automatic text reminders sent to customers 24 hours before.",
  },
  {
    title: "Payments \u2014 In-Store or Text-to-Pay",
    icon: CreditCard,
    image: featurePayments,
    description:
      "Take payment at the counter, push to a terminal, or text a payment link. Customers choose cash or card. Receipts emailed with PDF attached.",
  },
  {
    title: "Customer & Vehicle Management",
    icon: Users,
    image: featureCustomers,
    description:
      "Full customer profiles with every vehicle, every visit, every service \u2014 searchable instantly. VIN decode auto-fills year, make, model, and engine.",
  },
  {
    title: "QuickBooks Auto-Sync",
    icon: BookOpen,
    image: featureQuickbooks,
    description:
      "Every invoice and payment syncs to QuickBooks automatically. Dual pricing splits into its own income account. No CSV imports. Set it and forget it.",
  },
  {
    title: "AI-Powered Assistant \u2014 Voice Enabled",
    icon: Sparkles,
    image: featureAiAssistant,
    description:
      "An intelligent assistant on every screen that knows your shop, your RO, and your settings. Ask a question by typing or talking. It walks you through any process step by step.",
  },
  {
    title: "Text, Email & Call \u2014 All Built In",
    icon: MessageSquare,
    image: featureCommunication,
    description:
      "Text estimates, email invoices, call customers \u2014 without leaving the app. Every touchpoint logged automatically on the customer timeline.",
  },
  {
    title: "Reports & Excel Export",
    icon: BarChart3,
    image: featureReports,
    description:
      "Revenue, car count, approval rates, dual pricing earnings, technician productivity. Download any report as a professionally formatted Excel spreadsheet.",
  },
  {
    title: "Staff Management",
    icon: UserCog,
    image: featureStaff,
    description:
      "Add managers, service advisors, and technicians with role-based access. Assign bays, set pay rates, and manage PINs. Everyone sees only what they need.",
  },
];

interface DeepDive {
  headline: string;
  body: string;
  badges: string[];
  reversed: boolean;
  image?: string;
  customVisual?: boolean;
}

const deepDives: DeepDive[] = [
  {
    image: deepDualPricing,
    headline: "Dual Pricing That Keeps You Compliant and Profitable",
    body: "Every estimate, invoice, and receipt shows two prices \u2014 a cash price and a card price. Your customer chooses how to pay. No surprises, no fine print. Legal in all 50 states. The difference goes straight to covering your processing costs, so you keep the same margin either way.",
    badges: [
      "Legal in all 50 states",
      "Cash price and card price on every document",
      "Configurable dual pricing rate",
      "Customers simply see two prices",
    ],
    reversed: false,
  },
  {
    image: deepDvi,
    headline: "Inspections That Sell Work \u2014 Without the Hard Sell",
    body: "Your tech does a 72-point inspection on a tablet, right in the bay. One tap for green, yellow, or red. Photos from the camera go right on the report. When it\u2019s done, the customer gets a clean visual report on their phone \u2014 they see exactly what needs attention, with pictures. Items they approve convert to service lines on the RO with one click.",
    badges: [
      "72-point checklist across 9 categories",
      "Photo capture built in",
      "Green / Yellow / Red one-tap scoring",
      "Customer report sent via text",
      "Approved items auto-create RO lines",
    ],
    reversed: true,
  },
  {
    image: deepPartstech,
    headline: "Every Part, Every Supplier, One Search",
    body: "Search PartsTech\u2019s network of 30,000+ supplier locations without leaving the repair order. See live inventory, wholesale pricing, ratings, and delivery times from O\u2019Reilly, NAPA, AutoZone, Advance, WorldPac, and more. Add parts to your cart, and they land on the RO with your markup already calculated. No double-entry. No mistakes.",
    badges: [
      "30,000+ supplier locations",
      "Live inventory and pricing",
      "Markup auto-applied",
      "Order tracking: quoted to installed",
    ],
    reversed: false,
  },
  {
    customVisual: true,
    headline: "Your Books Stay Current \u2014 Automatically",
    body: "Connect QuickBooks in 30 seconds. From that point on, every invoice and every payment syncs automatically. Labor goes to your labor income account. Parts to parts revenue. Dual pricing to its own trackable income account. Tax to your liability account. No more end-of-month data entry. No CSV imports. Your accountant will thank you.",
    badges: [
      "One-click QuickBooks Online connection",
      "Real-time invoice and payment sync",
      "Dual pricing tracked separately",
      "Chart of accounts fully configurable",
    ],
    reversed: true,
  },
  {
    image: deepAiAssistant,
    headline: "An Expert in Your Pocket \u2014 On Every Screen",
    body: "PCB Auto includes an AI assistant that lives on every page of the application. It knows which screen you\u2019re on, which repair order you\u2019re looking at, and how your shop is configured. Ask it anything \u2014 by typing or by voice. It walks you through the process step by step. New employee? They\u2019re productive on day one.",
    badges: [
      "Context-aware \u2014 knows your current page and RO",
      "Voice input \u2014 tap the mic and talk",
      "Read aloud \u2014 tap the speaker to hear the answer",
      "Guides new staff through any workflow",
    ],
    reversed: false,
  },
];

const integrations = [
  { icon: Cog, name: "PartsTech", category: "Parts Ordering" },
  { icon: BookOpen, name: "QuickBooks", category: "Accounting" },
  { icon: CreditCard, name: "FluidPay", category: "Payment Gateway" },
  { icon: Mail, name: "Resend", category: "Email Delivery" },
  { icon: Search, name: "NHTSA", category: "VIN Decode" },
  { icon: Sparkles, name: "Claude AI", category: "AI Assistant" },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function AutoLogin() {
  const { login } = useAutoAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      setLocation("/auto/dashboard");
    } catch (err: any) {
      toast({ title: "Login Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="page-auto-login">
      <nav
        className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b"
        data-testid="nav-bar"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <img
            src={pcbAutoLogo}
            alt="PCB Auto"
            className="h-14 sm:h-16 object-contain"
            data-testid="nav-logo"
          />
          <Button
            variant="default"
            onClick={() => scrollTo("login")}
            data-testid="nav-signin-button"
          >
            Sign In
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </nav>

      <section
        className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 py-12 sm:py-16 px-6"
        data-testid="section-hero"
      >
        <div className="max-w-4xl mx-auto text-center">
          <img
            src={pcbAutoLogo}
            alt="PCB Auto"
            className="mx-auto h-56 sm:h-64 md:h-80 lg:h-96 object-contain mb-4"
            data-testid="hero-logo"
          />
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight"
            data-testid="hero-headline"
          >
            The Complete Auto Repair Shop Management Platform
          </h1>
          <p
            className="text-lg md:text-xl text-slate-300 mb-6 max-w-2xl mx-auto"
            data-testid="hero-subheadline"
          >
            Streamline repair orders, inspections, scheduling, payments, and customer communication — all in one
            powerful platform built for modern auto repair shops.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => scrollTo("login")}
              data-testid="hero-get-started-button"
            >
              Get Started
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="backdrop-blur-md bg-background/10 text-white"
              onClick={() => scrollTo("features")}
              data-testid="hero-explore-features-button"
            >
              Explore Features
            </Button>
          </div>
        </div>
      </section>

      <section
        id="demo-video"
        className="relative bg-gradient-to-b from-slate-900 to-slate-800 py-16 md:py-20 px-4 md:px-6"
        data-testid="section-demo-video"
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-3"
            data-testid="text-demo-heading"
          >
            See PCB Auto in Action
          </h2>
          <p
            className="text-slate-300 text-lg mb-10"
            data-testid="text-demo-subheading"
          >
            Everything your shop needs — in one 2-minute walkthrough
          </p>
          <div className="max-w-[960px] mx-auto rounded-md overflow-hidden shadow-lg">
            <iframe
              src="https://player.vimeo.com/video/1163099932?h=37a0e865bc&title=0&byline=0&portrait=0&autoplay=0"
              className="w-full aspect-video"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              loading="lazy"
              title="PCB Auto Demo"
              data-testid="iframe-demo-video"
            />
          </div>
          <p
            className="text-slate-400 text-sm mt-8"
            data-testid="text-demo-features"
          >
            Repair Orders · Digital Inspections · Parts Ordering · Scheduling · Payments · All Connected
          </p>
        </div>
      </section>

      <section
        id="features"
        className="py-20 px-6 bg-background"
        data-testid="section-features"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              data-testid="features-heading"
            >
              Everything Your Shop Needs
            </h2>
            <p className="text-muted-foreground text-lg" data-testid="features-subheading">
              Powerful tools designed specifically for auto repair professionals
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="hover-elevate overflow-visible"
                  data-testid={`card-feature-${index}`}
                >
                  <div className="aspect-[4/3] overflow-hidden rounded-t-md">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-full object-cover"
                      data-testid={`img-feature-${index}`}
                    />
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-5 w-5 text-primary shrink-0" />
                      <h3 className="font-semibold text-sm">{feature.title}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="deep-dives">
        {deepDives.map((dive, index) => (
          <div
            key={index}
            className={`${index % 2 === 0 ? "bg-background" : "bg-muted/30"} py-16 md:py-20 px-6`}
            data-testid={`deep-dive-${index}`}
          >
            <div
              className={`max-w-6xl mx-auto flex flex-col gap-8 md:gap-12 ${
                dive.reversed ? "md:flex-row-reverse" : "md:flex-row"
              } items-center`}
            >
              <div className="md:w-1/2 w-full">
                {dive.customVisual ? (
                  <QBSyncMockup />
                ) : dive.image ? (
                  <div className="rounded-md overflow-hidden shadow-lg">
                    <img
                      src={dive.image}
                      alt={dive.headline}
                      className="w-full h-full object-cover"
                      data-testid={`img-deep-dive-${index}`}
                    />
                  </div>
                ) : null}
              </div>
              <div className="md:w-1/2 w-full space-y-5">
                <h3
                  className="text-2xl md:text-3xl font-bold"
                  data-testid={`text-deep-dive-headline-${index}`}
                >
                  {dive.headline}
                </h3>
                <p
                  className="text-muted-foreground leading-relaxed"
                  data-testid={`text-deep-dive-body-${index}`}
                >
                  {dive.body}
                </p>
                <div className="flex flex-wrap gap-2">
                  {dive.badges.map((badge) => (
                    <Badge
                      key={badge}
                      variant="secondary"
                      data-testid={`badge-deep-dive-${index}`}
                    >
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section
        id="integrations"
        className="py-16 md:py-20 px-6 bg-muted/40"
        data-testid="section-integrations"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-muted-foreground text-sm uppercase tracking-wider mb-2">
              Integrations
            </p>
            <h2 className="text-2xl md:text-3xl font-bold">
              Connected to the Tools You Already Use
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {integrations.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.name}
                  className="text-center"
                  data-testid={`card-integration-${index}`}
                >
                  <CardContent className="p-5 flex flex-col items-center gap-2">
                    <Icon className="h-7 w-7 text-primary" />
                    <span className="font-semibold text-sm">{item.name}</span>
                    <span className="text-muted-foreground text-xs">{item.category}</span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="cta"
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 py-20 md:py-24 px-6"
        data-testid="section-cta"
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-5"
            data-testid="text-cta-headline"
          >
            Stop Paying for Five Systems That Don't Talk to Each Other
          </h2>
          <p
            className="text-lg text-slate-300 mb-10 leading-relaxed"
            data-testid="text-cta-subheadline"
          >
            PCB Auto replaces your estimate tool, your inspection app, your parts catalog, your scheduler, and your payment system — with one platform that connects everything.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
            <Button
              size="lg"
              onClick={() =>
                (window.location.href =
                  "mailto:hello@pcbancard.com?subject=PCB Auto Demo Request")
              }
              data-testid="button-cta-demo"
            >
              Schedule a Demo
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="backdrop-blur-md bg-background/10 text-white"
              onClick={() => scrollTo("demo-video")}
              data-testid="button-cta-video"
            >
              Watch the Video
            </Button>
          </div>
          <p className="text-slate-400 text-sm" data-testid="text-cta-tagline">
            Built for independent auto repair shops · Bundled with payment processing · Fraction of the cost of Tekmetric or Shop-Ware
          </p>
        </div>
      </section>

      <section
        id="login"
        className="py-20 px-6 bg-muted/40"
        data-testid="section-login"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              data-testid="login-heading"
            >
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground text-lg" data-testid="login-subheading">
              Sign in to your shop account or contact us to set up your shop.
            </p>
          </div>
          <div className="flex justify-center">
            <Card className="w-full max-w-sm">
              <CardHeader className="text-center">
                <img
                  src={pcbAutoLogo}
                  alt="PCB Auto"
                  className="mx-auto h-32 object-contain mb-3"
                />
                <CardDescription>Sign in to your shop account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@shop.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative flex items-center">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                        data-testid="input-password"
                      />
                      <button
                        type="button"
                        className="absolute right-2 flex items-center justify-center text-muted-foreground transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                    data-testid="button-login"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Sign In
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer
        className="bg-slate-900 text-white py-16 px-6"
        data-testid="section-footer"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <img
              src={pcbAutoLogo}
              alt="PCB Auto"
              className="h-16 object-contain mb-4"
              data-testid="footer-logo"
            />
            <p className="text-slate-400 text-sm leading-relaxed">
              Modern shop management for modern auto repair businesses.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4" data-testid="footer-contact-heading">
              Contact Us
            </h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <a
                  href="mailto:hello@pcbancard.com"
                  className="transition-colors"
                  data-testid="link-email"
                >
                  hello@pcbancard.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <a
                  href="tel:+18885377332"
                  className="transition-colors"
                  data-testid="link-phone"
                >
                  (888) 537-7332
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span data-testid="text-address">
                  420 Boulevard Suite 206, Mountain Lakes, NJ 07046
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4" data-testid="footer-product-heading">
              Product
            </h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>
                <Button
                  variant="ghost"
                  className="p-0 h-auto text-slate-400"
                  onClick={() => scrollTo("features")}
                  data-testid="footer-link-features"
                >
                  Features
                </Button>
              </li>
              <li>
                <Button
                  variant="ghost"
                  className="p-0 h-auto text-slate-400"
                  onClick={() => scrollTo("login")}
                  data-testid="footer-link-signin"
                >
                  Sign In
                </Button>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-slate-800">
          <p className="text-center text-slate-500 text-sm" data-testid="text-copyright">
            2026 PCBancard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
