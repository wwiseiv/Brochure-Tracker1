import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard, Users, Car, FileText, ClipboardCheck,
  Calendar, Settings, LogOut, Menu, X, Wrench, ChevronDown,
  UserPlus, CreditCard, BarChart3, MoreHorizontal, HelpCircle,
  DollarSign, Printer, Mail, Phone, Shield, Receipt,
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

const NAV_ITEMS = [
  { path: "/auto/dashboard", label: "Dashboard", shortLabel: "Dash", icon: LayoutDashboard },
  { path: "/auto/customers", label: "Customers", shortLabel: "Cust", icon: Users },
  { path: "/auto/repair-orders", label: "Repair Orders", shortLabel: "ROs", icon: FileText },
  { path: "/auto/inspections", label: "Inspections", shortLabel: "Insp", icon: ClipboardCheck },
  { path: "/auto/schedule", label: "Schedule", shortLabel: "Sched", icon: Calendar },
  { path: "/auto/reports", label: "Reports", shortLabel: "Reports", icon: BarChart3 },
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

function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const helpSections = [
    {
      icon: Receipt,
      title: "Invoice & Payments",
      items: [
        "Open any Repair Order and tap 'Invoice / Pay' to view the dual pricing invoice.",
        "Choose Cash or Card payment method \u2014 card payments include the surcharge automatically.",
        "Add an optional tip before processing the payment.",
        "After payment, print or email the receipt directly to the customer.",
      ],
    },
    {
      icon: DollarSign,
      title: "Dual Pricing",
      items: [
        "Cash and Card prices are calculated automatically based on your surcharge rate.",
        "Adjust the surcharge rate in Invoice Settings (gear icon on the invoice page).",
        "The surcharge is disclosed on all invoices, receipts, and emails.",
        "Typical surcharge rates are between 3% and 4%.",
      ],
    },
    {
      icon: Mail,
      title: "Email Invoices & Receipts",
      items: [
        "Tap 'Email Invoice' on the invoice page to send a professional email with PDF attachment.",
        "After payment, tap 'Email Receipt' to send the receipt with payment confirmation.",
        "Emails are sent from service@pcbisv.com with your shop name.",
        "Customers must have an email address on file to receive emails.",
      ],
    },
    {
      icon: Phone,
      title: "Customer Communication",
      items: [
        "Tap the phone, text, or email icons next to any customer to reach them instantly.",
        "Pre-filled templates are available for estimates, invoices, and appointment reminders.",
        "All communications are logged automatically in the customer's history.",
      ],
    },
    {
      icon: Shield,
      title: "Repair Orders",
      items: [
        "Create ROs from the Repair Orders page \u2014 add customer, vehicle, and line items.",
        "Send estimates for customer approval via text or email with one tap.",
        "Track RO status from estimate through completion and payment.",
        "Download PDF estimates, work orders, and invoices at any time.",
      ],
    },
    {
      icon: Printer,
      title: "Printing",
      items: [
        "Tap 'Print' on any invoice or receipt to open your browser's print dialog.",
        "Receipts are formatted for standard receipt printers.",
        "Use your browser's 'Save as PDF' option for a digital copy.",
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0" data-testid="dialog-help">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Help & Guide
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="px-5 pb-5 max-h-[70vh]">
          <div className="space-y-4 pt-2">
            {helpSections.map((section, i) => (
              <div key={i}>
                {i > 0 && <Separator className="mb-4" />}
                <div className="flex items-center gap-2 mb-2">
                  <section.icon className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">{section.title}</h3>
                </div>
                <ul className="space-y-1.5 ml-6">
                  {section.items.map((item, j) => (
                    <li key={j} className="text-sm text-muted-foreground leading-relaxed list-disc">{item}</li>
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
  const [location] = useLocation();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const isOwnerOrManager = user?.role === "owner" || user?.role === "manager";

  return (
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
              <Link href="/auto/integrations">
                <DropdownMenuItem data-testid="menu-integrations">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Integrations
                </DropdownMenuItem>
              </Link>
            )}
            <DropdownMenuItem onClick={() => setHelpOpen(true)} data-testid="menu-help">
              <HelpCircle className="h-4 w-4 mr-2" />
              Help & Guide
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} data-testid="button-logout">
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
            }}
            data-testid="more-logout"
          >
            <LogOut className="h-5 w-5" />
            Log Out
          </button>
        </div>
      </div>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
