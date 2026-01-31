import { Link, useLocation } from "wouter";
import { Home, QrCode, User, Store, MessageSquare, FileSignature, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { path: "/", icon: Home, label: "Home", tooltip: "Go to home screen" },
  { path: "/scan", icon: QrCode, label: "Scan", tooltip: "Scan & drop a brochure" },
  { path: "/esign", icon: FileSignature, label: "E-Sign", tooltip: "Electronic signature documents" },
  { path: "/coach", icon: MessageSquare, label: "Coach", tooltip: "AI sales coaching" },
  { path: "/merchants", icon: Store, label: "Merchants", tooltip: "View your merchants" },
  { path: "/profile", icon: User, label: "Profile", tooltip: "Your profile & settings" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-inset-bottom bottom-nav-fixed">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Tooltip key={item.path} delayDuration={700}>
              <TooltipTrigger asChild>
                <Link href={item.path}>
                  <button
                    data-testid={`nav-${item.label.toLowerCase()}`}
                    className={`flex flex-col items-center justify-center gap-1 min-w-[54px] min-h-touch py-2 px-1.5 rounded-lg transition-colors ${
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover-elevate"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{item.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </nav>
  );
}

export function FloatingHelpButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href="/help">
          <button
            data-testid="button-floating-help"
            className="fixed top-4 right-4 z-50 w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors shadow-sm"
            aria-label="Help"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>Help & Support</p>
      </TooltipContent>
    </Tooltip>
  );
}
