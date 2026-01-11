import { Link, useLocation } from "wouter";
import { Home, QrCode, History, User, Store, MessageSquare } from "lucide-react";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/scan", icon: QrCode, label: "Scan" },
  { path: "/coach", icon: MessageSquare, label: "Coach" },
  { path: "/merchants", icon: Store, label: "Merchants" },
  { path: "/history", icon: History, label: "History" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path}>
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
          );
        })}
      </div>
    </nav>
  );
}
