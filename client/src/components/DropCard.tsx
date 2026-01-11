import { Card } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { BusinessTypeIcon, businessTypeLabels } from "./BusinessTypeIcon";
import { MapPin, Clock } from "lucide-react";
import { formatDistanceToNow, format, isToday, isPast, isTomorrow } from "date-fns";
import type { DropWithBrochure, BusinessType } from "@shared/schema";
import { Link } from "wouter";

interface DropCardProps {
  drop: DropWithBrochure;
  variant?: "default" | "urgent" | "overdue";
}

export function DropCard({ drop, variant = "default" }: DropCardProps) {
  const pickupDate = drop.pickupScheduledFor ? new Date(drop.pickupScheduledFor) : null;
  const isOverdue = pickupDate && isPast(pickupDate) && drop.status === "pending";
  const isDueToday = pickupDate && isToday(pickupDate);
  const isDueTomorrow = pickupDate && isTomorrow(pickupDate);
  
  const borderColor = isOverdue 
    ? "border-l-destructive" 
    : isDueToday 
      ? "border-l-primary" 
      : "border-l-border";

  return (
    <Link href={`/drops/${drop.id}`}>
      <Card 
        className={`p-4 border-l-4 ${borderColor} hover-elevate cursor-pointer transition-all`}
        data-testid={`drop-card-${drop.id}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <BusinessTypeIcon 
              type={(drop.businessType as BusinessType) || "other"} 
              className="w-5 h-5 text-muted-foreground" 
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base truncate" data-testid="drop-business-name">
                {drop.businessName || "Unknown Business"}
              </h3>
              <StatusBadge status={drop.status as any} outcome={drop.outcome as any} />
            </div>
            
            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate" data-testid="drop-address">
                {drop.address || "No address"}
              </span>
            </div>
            
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Dropped {formatDistanceToNow(new Date(drop.droppedAt), { addSuffix: true })}</span>
              </div>
              
              {pickupDate && drop.status === "pending" && (
                <div className={`text-xs font-medium ${
                  isOverdue 
                    ? "text-destructive" 
                    : isDueToday 
                      ? "text-primary" 
                      : isDueTomorrow 
                        ? "text-warning" 
                        : "text-muted-foreground"
                }`}>
                  {isOverdue 
                    ? `Overdue ${formatDistanceToNow(pickupDate)}`
                    : isDueToday 
                      ? "Due today"
                      : isDueTomorrow
                        ? "Due tomorrow"
                        : `Due ${format(pickupDate, "MMM d")}`
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
