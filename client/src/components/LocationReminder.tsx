import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Bell, X, MapPin } from "lucide-react";
import type { NearbyDrop } from "@/hooks/use-location-reminders";

interface LocationReminderProps {
  nearbyDrop: NearbyDrop | null;
  onDismiss: () => void;
}

export function LocationReminder({ nearbyDrop, onDismiss }: LocationReminderProps) {
  if (!nearbyDrop) return null;

  const distanceText = nearbyDrop.distance < 100 
    ? "less than 100m" 
    : `${Math.round(nearbyDrop.distance)}m`;

  return (
    <AnimatePresence>
      {nearbyDrop && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-0 right-0 z-40 px-4 pb-2"
          data-testid="location-reminder"
        >
          <div className="max-w-md mx-auto bg-primary text-primary-foreground rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Bell className="w-5 h-5" data-testid="icon-bell" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base" data-testid="reminder-title">
                  You're near {nearbyDrop.drop.businessName || "a pickup location"}!
                </p>
                <div className="flex items-center gap-1 mt-0.5 text-sm opacity-90">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate" data-testid="reminder-distance">
                    {distanceText} away
                  </span>
                </div>
              </div>

              <button
                onClick={onDismiss}
                className="flex-shrink-0 p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
                data-testid="button-dismiss-reminder"
                aria-label="Dismiss reminder"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <Link href={`/drops/${nearbyDrop.drop.id}`} className="flex-1">
                <Button 
                  variant="secondary" 
                  className="w-full"
                  data-testid="button-view-drop"
                >
                  View Drop
                </Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={onDismiss}
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20"
                data-testid="button-dismiss"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
