import { Package, Calendar, History, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface EmptyStateProps {
  type: "today" | "upcoming" | "overdue" | "history" | "drops";
}

const emptyStateConfig = {
  today: {
    icon: Calendar,
    title: "No pickups scheduled for today",
    description: "When you have brochures due for pickup today, they'll appear here.",
  },
  upcoming: {
    icon: Calendar,
    title: "No upcoming pickups",
    description: "Schedule follow-up dates when you drop brochures.",
  },
  overdue: {
    icon: Package,
    title: "Nothing overdue",
    description: "You're on top of all your pickups!",
  },
  history: {
    icon: History,
    title: "No completed drops yet",
    description: "Your pickup history will appear here once you complete some.",
  },
  drops: {
    icon: Package,
    title: "No drops yet",
    description: "Start by scanning a brochure QR code to log your first drop.",
  },
};

export function EmptyState({ type }: EmptyStateProps) {
  const config = emptyStateConfig[type];
  const Icon = config.icon;
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{config.title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{config.description}</p>
      
      {type === "drops" && (
        <Link href="/scan">
          <Button className="mt-6 gap-2" data-testid="button-scan-first">
            <QrCode className="w-4 h-4" />
            Scan Your First Brochure
          </Button>
        </Link>
      )}
    </div>
  );
}
