import { useState, useRef, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard, Users, Car, FileText, ClipboardCheck,
  Calendar, Settings, LogOut, Menu, X, Wrench, ChevronDown,
  UserPlus, CreditCard, BarChart3, MoreHorizontal, HelpCircle,
  DollarSign, Printer, Mail, Phone, Shield, Receipt, Landmark,
  Search, Sparkles,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AutoAssistantProvider } from "@/components/auto/AutoAssistantProvider";
import { AutoAssistantChat } from "@/components/auto/AutoAssistantChat";
import { AIHelpChat } from "@/components/ai-help";

const NAV_ITEMS = [
  { path: "/auto/dashboard", label: "Dashboard", shortLabel: "Dash", icon: LayoutDashboard },
  { path: "/auto/customers", label: "Customers", shortLabel: "Cust", icon: Users },
  { path: "/auto/repair-orders", label: "Repair Orders", shortLabel: "ROs", icon: FileText },
  { path: "/auto/inspections", label: "Inspections", shortLabel: "Insp", icon: ClipboardCheck },
  { path: "/auto/schedule", label: "Schedule", shortLabel: "Sched", icon: Calendar },
  { path: "/auto/reports", label: "Reports", shortLabel: "Reports", icon: BarChart3 },
  { path: "/auto/quickbooks", label: "QuickBooks", shortLabel: "QB", icon: Landmark },
  { path: "/auto/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
];

const BOTTOM_TAB_ITEMS = [
  { path: "/auto/dashboard", label: "Home", icon: LayoutDashboard, testId: "bottomnav-home" },
  { path: "/auto/repair-orders", label: "ROs", icon: FileText, testId: "bottomnav-ros" },
  { path: "/auto/schedule", label: "Schedule", icon: Calendar, testId: "bottomnav-schedule" },
  { path: "/auto/customers", label: "Cust", icon: Users, testId: "bottomnav-cust" },
];

const MORE_SHEET_ITEMS = [
  { path: "/auto/inspections", label: "Inspections", icon: ClipboardCheck },
  { path: "/auto/reports", label: "Reports", icon: BarChart3 },
  { path: "/auto/settings", label: "Settings", icon: Settings },
];

const HELP_SECTIONS = [
  {
    id: "invoices",
    icon: Receipt,
    title: "Invoice & Payments",
    keywords: ["invoice", "pay", "payment", "tip", "receipt", "cash", "card", "charge", "bill", "checkout"],
    items: [
      "Open any Repair Order and tap 'Invoice / Pay' to view the dual pricing invoice.",
      "Choose Cash or Card payment method \u2014 card payments use the dual pricing rate automatically.",
      "Add an optional tip before processing the payment.",
      "After payment, print or email the receipt directly to the customer.",
    ],
  },
  {
    id: "dual-pricing",
    icon: DollarSign,
    title: "Dual Pricing",
    keywords: ["dual", "pricing", "cash price", "card price", "rate", "percentage", "discount", "fee"],
    items: [
      "Cash and Card prices are calculated automatically based on your dual pricing rate.",
      "Adjust the dual pricing rate in Invoice Settings (gear icon on the invoice page).",
      "Both Cash Price and Card Price are shown on all invoices, receipts, and emails.",
      "Dual pricing rates are set by the business and typically run between 3 and 4%.",
    ],
  },
  {
    id: "email",
    icon: Mail,
    title: "Email Invoices & Receipts",
    keywords: ["email", "send", "receipt", "invoice", "pdf", "attachment", "notification"],
    items: [
      "Tap 'Email Invoice' on the invoice page to send a professional email with PDF attachment.",
      "After payment, tap 'Email Receipt' to send the receipt with payment confirmation.",
      "Emails are sent from service@pcbisv.com with your shop name.",
      "Customers must have an email address on file to receive emails.",
    ],
  },
  {
    id: "communication",
    icon: Phone,
    title: "Customer Communication",
    keywords: ["call", "text", "sms", "phone", "message", "contact", "template", "communicate"],
    items: [
      "Tap the phone, text, or email icons next to any customer to reach them instantly.",
      "Pre-filled templates are available for estimates, invoices, and appointment reminders.",
      "All communications are logged automatically in the customer's history.",
    ],
  },
  {
    id: "repair-orders",
    icon: Shield,
    title: "Repair Orders",
    keywords: ["repair", "order", "ro", "estimate", "approval", "status", "work order", "line item", "service"],
    items: [
      "Create ROs from the Repair Orders page \u2014 add customer, vehicle, and line items.",
      "Send estimates for customer approval via text or email with one tap.",
      "Track RO status from estimate through completion and payment.",
      "Download PDF estimates, work orders, and invoices at any time.",
    ],
  },
  {
    id: "printing",
    icon: Printer,
    title: "Printing",
    keywords: ["print", "printer", "pdf", "download", "save", "paper"],
    items: [
      "Tap 'Print' on any invoice or receipt to open your browser's print dialog.",
      "Receipts are formatted for standard receipt printers.",
      "Use your browser's 'Save as PDF' option for a digital copy.",
    ],
  },
  {
    id: "inspections",
    icon: ClipboardCheck,
    title: "Digital Vehicle Inspections",
    keywords: ["inspection", "dvi", "vehicle", "check", "condition", "report", "photos"],
    items: [
      "Create inspections from the Inspections page or directly from a Repair Order.",
      "Rate each inspection point as Good, Fair, or Needs Attention.",
      "Share inspection results with customers via a public link.",
      "Download or email DVI reports as professional PDFs.",
    ],
  },
  {
    id: "scheduling",
    icon: Calendar,
    title: "Scheduling",
    keywords: ["schedule", "appointment", "calendar", "bay", "book", "time", "slot", "date"],
    items: [
      "View and manage appointments on the Schedule page with day, week, or list views.",
      "Click any appointment to jump directly to its linked Repair Order.",
      "Assign appointments to specific service bays for better shop flow.",
      "Drag appointments or use the form to reschedule quickly.",
    ],
  },
  {
    id: "customers",
    icon: Users,
    title: "Customers & Vehicles",
    keywords: ["customer", "vehicle", "car", "truck", "vin", "contact", "add", "edit", "profile"],
    items: [
      "Add customers from the Customers page with name, phone, email, and address.",
      "Each customer can have multiple vehicles linked to their profile.",
      "View full service history, communication log, and outstanding balances per customer.",
      "Search customers by name, phone, or vehicle info from the top search bar.",
    ],
  },
  {
    id: "settings",
    icon: Settings,
    title: "Shop Settings",
    keywords: ["settings", "shop", "name", "address", "logo", "tax", "labor", "rate", "configure"],
    items: [
      "Update your shop name, address, phone, and logo in Settings.",
      "Configure parts tax rate, labor tax rate, and default labor rate.",
      "Set up service bays for scheduling and workflow management.",
      "Manage staff accounts and assign roles (Owner, Manager, Technician).",
    ],
  },
];

function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setActiveSection(null);
    }
  }, [open]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return HELP_SECTIONS;
    const q = searchQuery.toLowerCase().trim();
    return HELP_SECTIONS.filter((section) => {
      if (section.title.toLowerCase().includes(q)) return true;
      if (section.keywords.some((k) => k.includes(q))) return true;
      if (section.items.some((item) => item.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [searchQuery]);

  const suggestedTopics = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase().trim();
    const suggestions: { section: string; sectionId: string; text: string }[] = [];
    for (const section of HELP_SECTIONS) {
      for (const item of section.items) {
        if (item.toLowerCase().includes(q)) {
          suggestions.push({ section: section.title, sectionId: section.id, text: item });
        }
      }
      if (section.title.toLowerCase().includes(q) && !suggestions.find(s => s.sectionId === section.id)) {
        suggestions.push({ section: section.title, sectionId: section.id, text: section.items[0] });
      }
    }
    return suggestions.slice(0, 5);
  }, [searchQuery]);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    setSearchQuery("");
    const el = sectionRefs.current[sectionId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const highlightMatch = (text: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) return text;
    const q = searchQuery.trim();
    const splitRegex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(splitRegex);
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? <mark key={i} className="bg-primary/20 text-foreground rounded px-0.5">{part}</mark> : part
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0" data-testid="dialog-help">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Help & Guide
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
            <Input
              placeholder="Search help topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
              data-testid="input-help-search"
            />
          </div>

          {suggestedTopics.length > 0 && searchQuery.length >= 2 && (
            <div className="border rounded-md overflow-hidden divide-y" data-testid="help-suggestions">
              {suggestedTopics.map((suggestion, i) => (
                <button
                  key={i}
                  className="flex items-start gap-2 w-full px-3 py-2 text-left text-sm hover-elevate"
                  onClick={() => scrollToSection(suggestion.sectionId)}
                  data-testid={`help-suggestion-${i}`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-primary">{suggestion.section}</span>
                    <p className="text-muted-foreground text-xs leading-relaxed truncate">{suggestion.text}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5" data-testid="help-shortcuts">
            {HELP_SECTIONS.map((section) => (
              <Badge
                key={section.id}
                variant={activeSection === section.id ? "default" : "outline"}
                className="cursor-pointer text-xs gap-1"
                onClick={() => scrollToSection(section.id)}
                data-testid={`help-shortcut-${section.id}`}
              >
                <section.icon className="h-3 w-3" />
                {section.title.split(" ").slice(0, 2).join(" ")}
              </Badge>
            ))}
          </div>
        </div>

        <ScrollArea className="px-5 pb-5 max-h-[55vh]">
          <div className="space-y-4 pt-1">
            {filteredSections.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm" data-testid="help-no-results">
                No help topics match your search. Try different keywords.
              </div>
            )}
            {filteredSections.map((section, i) => (
              <div
                key={section.id}
                ref={(el) => { sectionRefs.current[section.id] = el; }}
                data-testid={`help-section-${section.id}`}
              >
                {i > 0 && <Separator className="mb-4" />}
                <div className="flex items-center gap-2 mb-2">
                  <section.icon className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">{highlightMatch(section.title)}</h3>
                </div>
                <ul className="space-y-1.5 ml-6">
                  {section.items.map((item, j) => (
                    <li key={j} className="text-sm text-muted-foreground leading-relaxed list-disc">{highlightMatch(item)}</li>
                  ))}
                </ul>
              </div>
            ))}
            <Separator />
            <div className="text-center text-xs text-muted-foreground py-2">
              Need more help? Contact support at <a href="mailto:hello@pcbancard.com" className="text-primary hover:underline">hello@pcbancard.com</a> or call <a href="tel:8885377332" className="text-primary hover:underline">(888) 537-7332</a>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function AutoLayout({ children }: { children: React.ReactNode }) {
  const { user, shop, logout } = useAutoAuth();
  const [location, setLocation] = useLocation();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const isOwnerOrManager = user?.role === "owner" || user?.role === "manager";

  return (
    <AutoAssistantProvider>
    <div className="flex flex-col h-screen bg-background" data-testid="auto-layout">
      {/* Phone top bar: slim logo + avatar */}
      <header className="sm:hidden sticky top-0 z-50 flex items-center justify-between gap-2 px-4 py-2 border-b bg-background">
        <Link href="/auto/dashboard">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
              <Wrench className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-sm" data-testid="text-brand-mobile">PCB Auto</span>
              {shop && <span className="text-xs text-muted-foreground ml-2">{shop.name}</span>}
            </div>
          </div>
        </Link>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
      </header>

      {/* Tablet + Desktop top bar */}
      <header className="hidden sm:flex sticky top-0 z-50 items-center justify-between gap-2 px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-3">
          <Link href="/auto/dashboard">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
                <Wrench className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <span className="font-bold text-sm" data-testid="text-brand">PCB Auto</span>
                {shop && <span className="text-xs text-muted-foreground ml-2">{shop.name}</span>}
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.startsWith(item.path);
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                  <span className="lg:hidden">{item.shortLabel}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-user-menu">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="hidden lg:inline text-sm">{user?.firstName}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace("_", " ")}</p>
            </div>
            <DropdownMenuSeparator />
            {isOwnerOrManager && (
              <Link href="/auto/staff">
                <DropdownMenuItem data-testid="menu-staff">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Staff Management
                </DropdownMenuItem>
              </Link>
            )}
            {isOwnerOrManager && (
              <Link href="/auto/quickbooks">
                <DropdownMenuItem data-testid="menu-integrations">
                  <Landmark className="h-4 w-4 mr-2" />
                  QuickBooks
                </DropdownMenuItem>
              </Link>
            )}
            {isOwnerOrManager && (
              <Link href="/auto/processor">
                <DropdownMenuItem data-testid="menu-processor">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Payment Processor
                </DropdownMenuItem>
              </Link>
            )}
            <DropdownMenuItem onClick={() => setHelpOpen(true)} data-testid="menu-help">
              <HelpCircle className="h-4 w-4 mr-2" />
              Help & Guide
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { logout(); setLocation("/auto/login"); }} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="flex-1 overflow-auto pb-16 sm:pb-0">
        {children}
      </main>

      {/* Phone bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 flex items-center justify-around border-t bg-background" style={{ minHeight: "48px" }}>
        {BOTTOM_TAB_ITEMS.map((item) => {
          const isActive = location.startsWith(item.path);
          return (
            <Link key={item.path} href={item.path}>
              <button
                className={`flex flex-col items-center justify-center gap-0.5 px-3 min-h-[48px] rounded-md text-xs ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
                data-testid={item.testId}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px]">{item.label}</span>
              </button>
            </Link>
          );
        })}
        <button
          className={`flex flex-col items-center justify-center gap-0.5 px-3 min-h-[48px] rounded-md text-xs ${
            moreSheetOpen ? "text-primary" : "text-muted-foreground"
          }`}
          onClick={() => setMoreSheetOpen(!moreSheetOpen)}
          data-testid="bottomnav-more"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px]">More</span>
        </button>
      </nav>

      {/* More bottom sheet backdrop */}
      {moreSheetOpen && (
        <div
          className="sm:hidden fixed inset-0 z-[55] bg-black/50"
          onClick={() => setMoreSheetOpen(false)}
        />
      )}

      {/* More bottom sheet */}
      <div
        className={`sm:hidden fixed bottom-0 inset-x-0 z-[60] bg-background rounded-t-xl border-t transition-transform duration-300 ease-in-out ${
          moreSheetOpen ? "translate-y-0" : "translate-y-full"
        }`}
        data-testid="bottom-sheet-more"
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="px-4 pb-6 space-y-1">
          {MORE_SHEET_ITEMS.map((item) => {
            const isActive = location.startsWith(item.path);
            const testId = item.label.toLowerCase().replace(/\s/g, "-");
            return (
              <Link key={item.path} href={item.path}>
                <button
                  className={`flex items-center gap-3 w-full px-3 py-3 rounded-md text-sm ${
                    isActive ? "text-primary bg-primary/10" : "text-foreground"
                  }`}
                  onClick={() => setMoreSheetOpen(false)}
                  data-testid={`more-${testId}`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </button>
              </Link>
            );
          })}
          {isOwnerOrManager && (
            <Link href="/auto/staff">
              <button
                className={`flex items-center gap-3 w-full px-3 py-3 rounded-md text-sm ${
                  location.startsWith("/auto/staff") ? "text-primary bg-primary/10" : "text-foreground"
                }`}
                onClick={() => setMoreSheetOpen(false)}
                data-testid="more-staff"
              >
                <UserPlus className="h-5 w-5" />
                Staff Management
              </button>
            </Link>
          )}
          {isOwnerOrManager && (
            <Link href="/auto/quickbooks">
              <button
                className={`flex items-center gap-3 w-full px-3 py-3 rounded-md text-sm ${
                  location.startsWith("/auto/quickbooks") ? "text-primary bg-primary/10" : "text-foreground"
                }`}
                onClick={() => setMoreSheetOpen(false)}
                data-testid="more-quickbooks"
              >
                <Landmark className="h-5 w-5" />
                QuickBooks
              </button>
            </Link>
          )}
          {isOwnerOrManager && (
            <Link href="/auto/processor">
              <button
                className={`flex items-center gap-3 w-full px-3 py-3 rounded-md text-sm ${
                  location.startsWith("/auto/processor") ? "text-primary bg-primary/10" : "text-foreground"
                }`}
                onClick={() => setMoreSheetOpen(false)}
                data-testid="more-processor"
              >
                <CreditCard className="h-5 w-5" />
                Payment Processor
              </button>
            </Link>
          )}
          <button
            className="flex items-center gap-3 w-full px-3 py-3 rounded-md text-sm text-foreground"
            onClick={() => {
              setMoreSheetOpen(false);
              setHelpOpen(true);
            }}
            data-testid="more-help"
          >
            <HelpCircle className="h-5 w-5" />
            Help & Guide
          </button>
          <button
            className="flex items-center gap-3 w-full px-3 py-3 rounded-md text-sm text-destructive"
            onClick={() => {
              setMoreSheetOpen(false);
              logout();
              setLocation("/auto/login");
            }}
            data-testid="more-logout"
          >
            <LogOut className="h-5 w-5" />
            Log Out
          </button>
        </div>
      </div>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <AutoAssistantChat />
      <AIHelpChat />
    </div>
    </AutoAssistantProvider>
  );
}
