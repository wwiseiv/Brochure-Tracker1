import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BusinessTypeIcon, businessTypeLabels } from "@/components/BusinessTypeIcon";
import { BottomNav, HamburgerMenu } from "@/components/BottomNav";
import { 
  MapPin, 
  Clock, 
  Navigation, 
  Calendar as CalendarIcon, 
  Route, 
  ExternalLink,
  ChevronLeft
} from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { Link } from "wouter";
import type { DropWithBrochure, BusinessType } from "@shared/schema";

interface RouteResponse {
  optimized: boolean;
  drops: DropWithBrochure[];
  totalDistance: number | null;
  estimatedTime: number | null;
}

function RouteCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
        </div>
      </div>
    </Card>
  );
}

function EmptyRouteState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Route className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-1" data-testid="text-empty-title">No pickups scheduled</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        When you have pickups scheduled for this date, your optimized route will appear here.
      </p>
      <Link href="/scan">
        <Button className="mt-6 gap-2" data-testid="button-scan-new">
          <MapPin className="w-4 h-4" />
          Schedule a Pickup
        </Button>
      </Link>
    </div>
  );
}

export default function RoutePlannerPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [, navigate] = useLocation();
  
  const isSelectedToday = isToday(selectedDate);
  const dateParam = isSelectedToday ? "today" : format(selectedDate, "yyyy-MM-dd");
  
  const { data: routeData, isLoading, error } = useQuery<RouteResponse>({
    queryKey: ["/api/route", dateParam],
    queryFn: async () => {
      const response = await fetch(`/api/route/${dateParam}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch route");
      const data = await response.json();
      if (Array.isArray(data)) {
        return {
          optimized: false,
          drops: data,
          totalDistance: null,
          estimatedTime: null,
        };
      }
      return data;
    },
  });

  const drops = routeData?.drops || [];
  const hasDrops = drops.length > 0;
  
  const generateGoogleMapsUrl = () => {
    if (!hasDrops) return "";
    
    const waypoints = drops
      .filter(d => d.latitude && d.longitude)
      .map(d => `${d.latitude},${d.longitude}`)
      .join("/");
    
    return `https://www.google.com/maps/dir/${waypoints}`;
  };

  const handleOpenMaps = () => {
    const url = generateGoogleMapsUrl();
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const formatPickupTime = (date: string | Date | null) => {
    if (!date) return "No time set";
    const d = new Date(date);
    return format(d, "h:mm a");
  };

  const handleBack = () => {
    if (window.history.length > 2) {
      window.history.back();
    } else {
      navigate("/");
    }
  };

  const getDateLabel = () => {
    if (isToday(selectedDate)) return "Today";
    if (isTomorrow(selectedDate)) return "Tomorrow";
    return format(selectedDate, "EEEE, MMM d");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <HamburgerMenu />
          <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-semibold">Route Planner</span>
        </div>
      </header>

      <main className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="min-h-touch gap-2 flex-1 justify-start"
                data-testid="button-date-picker"
              >
                <CalendarIcon className="w-4 h-4" />
                <span>{getDateLabel()}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setCalendarOpen(false);
                  }
                }}
                initialFocus
                data-testid="calendar-date-picker"
              />
            </PopoverContent>
          </Popover>
          
          {hasDrops && (
            <Button 
              className="min-h-touch gap-2"
              onClick={handleOpenMaps}
              data-testid="button-open-maps"
            >
              <Navigation className="w-4 h-4" />
              Open in Maps
              <ExternalLink className="w-3 h-3" />
            </Button>
          )}
        </div>

        {hasDrops && routeData && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center" data-testid="stat-stops">
              <div className="text-2xl font-bold text-primary">{drops.length}</div>
              <div className="text-xs text-muted-foreground">Stops</div>
            </Card>
            <Card className="p-4 text-center" data-testid="stat-distance">
              <div className="text-2xl font-bold text-primary">
                {routeData.totalDistance !== null ? `${routeData.totalDistance}` : "--"}
              </div>
              <div className="text-xs text-muted-foreground">km</div>
            </Card>
            <Card className="p-4 text-center" data-testid="stat-time">
              <div className="text-2xl font-bold text-primary">
                {routeData.estimatedTime !== null ? `${routeData.estimatedTime}` : "--"}
              </div>
              <div className="text-xs text-muted-foreground">min</div>
            </Card>
          </div>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-4" data-testid="text-route-heading">
            {isSelectedToday ? "Today's Route" : `Route for ${format(selectedDate, "MMM d")}`}
          </h2>
          
          {isLoading ? (
            <div className="space-y-3">
              <RouteCardSkeleton />
              <RouteCardSkeleton />
              <RouteCardSkeleton />
            </div>
          ) : error ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-destructive">Failed to load route data</p>
              <Button 
                variant="outline" 
                className="mt-4 min-h-touch"
                onClick={() => window.location.reload()}
                data-testid="button-retry"
              >
                Retry
              </Button>
            </Card>
          ) : !hasDrops ? (
            <EmptyRouteState />
          ) : (
            <div className="space-y-3">
              {drops.map((drop, index) => (
                <Link key={drop.id} href={`/drops/${drop.id}`}>
                  <Card 
                    className="p-4 hover-elevate cursor-pointer transition-all"
                    data-testid={`route-stop-${drop.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div 
                        className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm"
                        data-testid={`stop-number-${index + 1}`}
                      >
                        {index + 1}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-base truncate" data-testid="stop-business-name">
                            {drop.businessName || "Unknown Business"}
                          </h3>
                          <div className="flex-shrink-0">
                            <BusinessTypeIcon 
                              type={(drop.businessType as BusinessType) || "other"} 
                              className="w-5 h-5 text-muted-foreground" 
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate" data-testid="stop-address">
                            {drop.address || "No address available"}
                          </span>
                        </div>
                        
                        {drop.pickupScheduledFor && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-primary font-medium">
                            <Clock className="w-3 h-3" />
                            <span data-testid="stop-pickup-time">
                              Pickup: {formatPickupTime(drop.pickupScheduledFor)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {hasDrops && routeData?.optimized && (
          <p className="text-xs text-muted-foreground text-center" data-testid="text-optimized-note">
            Route has been optimized for shortest travel distance
          </p>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
