import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/BottomNav";
import { EmptyState } from "@/components/EmptyState";
import { 
  MapPin, 
  PackageCheck, 
  Trophy, 
  UserPlus, 
  Sparkles, 
  Box, 
  Play, 
  Target,
  ChevronDown,
  Activity as ActivityIcon,
  Filter
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ActivityEvent } from "@shared/schema";

interface UserRole {
  role: string;
  memberId: number;
  organization: {
    id: number;
    name: string;
  };
  managerId: number | null;
}

interface OrgMember {
  id: number;
  userId: string;
  role: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
}

const EVENT_TYPES = [
  { value: "all", label: "All Activity" },
  { value: "drop_created", label: "Drops Created" },
  { value: "pickup_completed", label: "Pickups Completed" },
  { value: "deal_signed", label: "Deals Signed" },
  { value: "referral_added", label: "Referrals Added" },
  { value: "referral_converted", label: "Referrals Converted" },
  { value: "inventory_restock", label: "Inventory Restocks" },
  { value: "sequence_started", label: "Sequences Started" },
  { value: "milestone_reached", label: "Milestones Reached" },
];

function getEventIcon(eventType: string) {
  switch (eventType) {
    case "drop_created":
      return <MapPin className="w-5 h-5" />;
    case "pickup_completed":
      return <PackageCheck className="w-5 h-5" />;
    case "deal_signed":
      return <Trophy className="w-5 h-5" />;
    case "referral_added":
      return <UserPlus className="w-5 h-5" />;
    case "referral_converted":
      return <Sparkles className="w-5 h-5" />;
    case "inventory_restock":
      return <Box className="w-5 h-5" />;
    case "sequence_started":
      return <Play className="w-5 h-5" />;
    case "milestone_reached":
      return <Target className="w-5 h-5" />;
    default:
      return <ActivityIcon className="w-5 h-5" />;
  }
}

function getEventColor(eventType: string) {
  switch (eventType) {
    case "drop_created":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "pickup_completed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "deal_signed":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "referral_added":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "referral_converted":
      return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400";
    case "inventory_restock":
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400";
    case "sequence_started":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "milestone_reached":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function ActivityCardSkeleton() {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <Skeleton className="w-10 h-10 rounded-full" />
        <Skeleton className="w-0.5 h-16 mt-2" />
      </div>
      <div className="flex-1 pb-6">
        <Skeleton className="h-5 w-32 mb-1" />
        <Skeleton className="h-4 w-48 mb-2" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

interface ActivityCardProps {
  event: ActivityEvent;
  isLast: boolean;
}

function ActivityCard({ event, isLast }: ActivityCardProps) {
  const isDealSigned = event.eventType === "deal_signed";
  
  return (
    <div 
      className="flex gap-4"
      data-testid={`activity-event-${event.id}`}
    >
      <div className="flex flex-col items-center">
        <div 
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getEventColor(event.eventType)} ${
            isDealSigned ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-background" : ""
          }`}
        >
          {getEventIcon(event.eventType)}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-border mt-2 min-h-[24px]" />
        )}
      </div>
      
      <div className={`flex-1 pb-6 ${isLast ? "" : ""}`}>
        <Card 
          className={`p-4 ${
            isDealSigned 
              ? "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800" 
              : ""
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" data-testid={`activity-title-${event.id}`}>
                {event.title}
                {isDealSigned && (
                  <span className="ml-2" aria-label="celebration">
                    <Trophy className="inline w-4 h-4 text-amber-500" />
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5" data-testid={`activity-agent-${event.id}`}>
                {event.agentName || "Team Member"}
              </p>
            </div>
            <span 
              className="text-xs text-muted-foreground whitespace-nowrap"
              data-testid={`activity-time-${event.id}`}
            >
              {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
            </span>
          </div>
          {event.description && (
            <p className="text-sm text-muted-foreground mt-2" data-testid={`activity-description-${event.id}`}>
              {event.description}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function ActivityFeedPage() {
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [limit, setLimit] = useState(20);

  const { data: userRole } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  const isAdminOrManager = userRole?.role === "master_admin" || userRole?.role === "relationship_manager";

  const { data: members } = useQuery<OrgMember[]>({
    queryKey: ["/api/organization/members"],
    enabled: isAdminOrManager,
  });

  const { data: activity, isLoading, isFetching } = useQuery<ActivityEvent[]>({
    queryKey: ["/api/activity", limit],
    queryFn: async () => {
      const response = await fetch(`/api/activity?limit=${limit}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch activity");
      }
      return response.json();
    },
  });

  const filteredActivity = activity?.filter((event) => {
    if (eventTypeFilter !== "all" && event.eventType !== eventTypeFilter) {
      return false;
    }
    if (agentFilter !== "all" && event.agentId !== agentFilter) {
      return false;
    }
    return true;
  }) || [];

  const uniqueAgents = activity 
    ? Array.from(new Map(activity.map(e => [e.agentId, { id: e.agentId, name: e.agentName }])).values())
    : [];

  const handleLoadMore = () => {
    setLimit((prev) => prev + 20);
  };

  const hasMore = activity && activity.length === limit;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ActivityIcon className="w-5 h-5 text-primary" />
            <span className="font-semibold">Team Activity</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {filteredActivity.length} events
          </span>
        </div>
      </header>

      <main className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-4 space-y-4">
        <div className="flex gap-2">
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger 
              className="flex-1 min-h-touch" 
              data-testid="filter-event-type"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Filter by type" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((type) => (
                <SelectItem 
                  key={type.value} 
                  value={type.value}
                  data-testid={`filter-type-${type.value}`}
                >
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAdminOrManager && (
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger 
                className="flex-1 min-h-touch" 
                data-testid="filter-agent"
              >
                <SelectValue placeholder="Filter by agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="filter-agent-all">
                  All Agents
                </SelectItem>
                {uniqueAgents.map((agent) => (
                  <SelectItem 
                    key={agent.id} 
                    value={agent.id}
                    data-testid={`filter-agent-${agent.id}`}
                  >
                    {agent.name || "Unknown Agent"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-0">
            <ActivityCardSkeleton />
            <ActivityCardSkeleton />
            <ActivityCardSkeleton />
            <ActivityCardSkeleton />
          </div>
        ) : filteredActivity.length > 0 ? (
          <>
            <div className="relative">
              {filteredActivity.map((event, index) => (
                <ActivityCard 
                  key={event.id} 
                  event={event} 
                  isLast={index === filteredActivity.length - 1}
                />
              ))}
            </div>

            {hasMore && (
              <Button
                variant="outline"
                className="w-full min-h-touch gap-2"
                onClick={handleLoadMore}
                disabled={isFetching}
                data-testid="button-load-more"
              >
                {isFetching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Load More Activity
                  </>
                )}
              </Button>
            )}
          </>
        ) : (
          <div className="py-12">
            <EmptyState type="history" />
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
