import { useState } from "react";
import { useLocation } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
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
  FileText,
  BarChart3,
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import pcbAutoLogo from "@assets/IMG_3010-small_for_logon_1770571814665.png";
import featureRepairOrders from "@/assets/images/feature-repair-orders.png";
import featureDvi from "@/assets/images/feature-dvi.png";
import featureScheduling from "@/assets/images/feature-scheduling.png";
import featureCustomers from "@/assets/images/feature-customers.png";
import featurePayments from "@/assets/images/feature-payments.png";
import featurePdf from "@/assets/images/feature-pdf.png";
import featureReports from "@/assets/images/feature-reports.png";
import featureApprovals from "@/assets/images/feature-approvals.png";

const features = [
  {
    title: "Repair Order Management",
    icon: Wrench,
    image: featureRepairOrders,
    description:
      "Create, track, and manage repair orders from start to finish with dual pricing, line-item details, and complete lifecycle management.",
  },
  {
    title: "Digital Vehicle Inspection",
    icon: ClipboardCheck,
    image: featureDvi,
    description:
      "Conduct thorough digital inspections with photo documentation, condition ratings, and instant customer sharing.",
  },
  {
    title: "Appointment Scheduling",
    icon: CalendarDays,
    image: featureScheduling,
    description:
      "Manage your shop calendar with easy booking, technician assignment, and automated reminders for upcoming appointments.",
  },
  {
    title: "Customer & Vehicle Database",
    icon: Users,
    image: featureCustomers,
    description:
      "Maintain detailed customer profiles and complete vehicle service histories for personalized, efficient service.",
  },
  {
    title: "Payment Processing",
    icon: CreditCard,
    image: featurePayments,
    description:
      "Handle split payments, track balances, and generate professional invoices with cash and card pricing support.",
  },
  {
    title: "Professional PDF Documents",
    icon: FileText,
    image: featurePdf,
    description:
      "Generate branded estimates, work orders, and invoices as professional PDFs with your shop logo and detailed line items.",
  },
  {
    title: "Reports & Analytics",
    icon: BarChart3,
    image: featureReports,
    description:
      "Track job profitability, sales tax, technician productivity, and approval conversion rates with comprehensive dashboards.",
  },
  {
    title: "Customer Approval Workflow",
    icon: CheckCircle,
    image: featureApprovals,
    description:
      "Send digital estimates for remote customer approval — customers can approve or decline individual service lines from their phone.",
  },
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
            className="h-10 object-contain"
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
        className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 py-24 px-6"
        data-testid="section-hero"
      >
        <div className="max-w-4xl mx-auto text-center">
          <img
            src={pcbAutoLogo}
            alt="PCB Auto"
            className="mx-auto h-32 object-contain mb-8"
            data-testid="hero-logo"
          />
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
            data-testid="hero-headline"
          >
            The Complete Auto Repair Shop Management Platform
          </h1>
          <p
            className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto"
            data-testid="hero-subheadline"
          >
            Streamline your repair orders, inspections, scheduling, and payments — all in one
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  className="mx-auto h-24 object-contain mb-3"
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
              className="h-12 object-contain mb-4"
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
                  variant="link"
                  className="p-0 h-auto text-slate-400"
                  onClick={() => scrollTo("features")}
                  data-testid="footer-link-features"
                >
                  Features
                </Button>
              </li>
              <li>
                <Button
                  variant="link"
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
