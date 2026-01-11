import { Badge } from "@/components/ui/badge";
import type { DropStatus, OutcomeType } from "@shared/schema";

interface StatusBadgeProps {
  status: DropStatus;
  outcome?: OutcomeType | null;
}

const statusConfig: Record<DropStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  picked_up: { label: "Picked Up", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  converted: { label: "Converted", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  lost: { label: "Lost", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300" },
};

const outcomeConfig: Record<OutcomeType, { label: string; icon: string }> = {
  signed: { label: "Signed", icon: "✅" },
  interested_appointment: { label: "Appointment Set", icon: "📅" },
  interested_later: { label: "Follow Up Later", icon: "🔄" },
  not_interested: { label: "Not Interested", icon: "❌" },
  closed: { label: "Business Closed", icon: "🚫" },
  not_found: { label: "Couldn't Find", icon: "❓" },
};

export function StatusBadge({ status, outcome }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant="secondary" 
      className={`${config.className} no-default-hover-elevate no-default-active-elevate`}
      data-testid="status-badge"
    >
      {outcome && outcomeConfig[outcome] 
        ? outcomeConfig[outcome].label 
        : config.label
      }
    </Badge>
  );
}

export function OutcomeBadge({ outcome }: { outcome: OutcomeType }) {
  const config = outcomeConfig[outcome];
  
  return (
    <span className="text-sm" data-testid="outcome-badge">
      {config.label}
    </span>
  );
}
