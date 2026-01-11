import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropCard } from "@/components/DropCard";
import { EmptyState } from "@/components/EmptyState";
import { DropCardSkeleton } from "@/components/LoadingState";
import { BottomNav } from "@/components/BottomNav";
import { ExportDialog } from "@/components/ExportDialog";
import { isToday, isPast, isFuture, addDays } from "date-fns";
import type { DropWithBrochure } from "@shared/schema";

type FilterType = "all" | "today" | "upcoming" | "overdue" | "completed";

export default function HistoryPage() {
  const searchParams = new URLSearchParams(useSearch());
  const initialFilter = (searchParams.get("filter") as FilterType) || "all";
  const [activeTab, setActiveTab] = useState<FilterType>(initialFilter);

  const { data: drops, isLoading } = useQuery<DropWithBrochure[]>({
    queryKey: ["/api/drops"],
  });

  const filterDrops = (drops: DropWithBrochure[], filter: FilterType) => {
    switch (filter) {
      case "today":
        return drops.filter(
          (d) =>
            d.status === "pending" &&
            d.pickupScheduledFor &&
            isToday(new Date(d.pickupScheduledFor))
        );
      case "upcoming":
        return drops.filter(
          (d) =>
            d.status === "pending" &&
            d.pickupScheduledFor &&
            isFuture(new Date(d.pickupScheduledFor)) &&
            !isToday(new Date(d.pickupScheduledFor)) &&
            new Date(d.pickupScheduledFor) <= addDays(new Date(), 7)
        );
      case "overdue":
        return drops.filter(
          (d) =>
            d.status === "pending" &&
            d.pickupScheduledFor &&
            isPast(new Date(d.pickupScheduledFor)) &&
            !isToday(new Date(d.pickupScheduledFor))
        );
      case "completed":
        return drops.filter((d) => d.status !== "pending");
      default:
        return drops;
    }
  };

  const filteredDrops = drops ? filterDrops(drops, activeTab) : [];
  const pendingCount = drops?.filter((d) => d.status === "pending").length || 0;
  const completedCount = drops?.filter((d) => d.status !== "pending").length || 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md mx-auto px-4 h-14 flex items-center">
          <span className="font-semibold">All Drops</span>
        </div>
      </header>

      <main className="container max-w-md mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterType)}>
          <TabsList className="w-full grid grid-cols-5 mb-4">
            <TabsTrigger value="all" className="text-xs min-h-touch" data-testid="tab-all">
              All
            </TabsTrigger>
            <TabsTrigger value="today" className="text-xs min-h-touch" data-testid="tab-today">
              Today
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="text-xs min-h-touch" data-testid="tab-upcoming">
              Soon
            </TabsTrigger>
            <TabsTrigger value="overdue" className="text-xs min-h-touch" data-testid="tab-overdue">
              Late
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs min-h-touch" data-testid="tab-completed">
              Done
            </TabsTrigger>
          </TabsList>

          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {filteredDrops.length} {filteredDrops.length === 1 ? "drop" : "drops"}
            </span>
            <div className="flex items-center gap-3">
              <ExportDialog
                title="Export Drops"
                description="Download your drop/contact data as a spreadsheet file."
                exportEndpoint="/api/drops/export"
                buttonLabel="Export"
              />
              <div className="flex gap-3 text-xs">
                <span className="text-amber-600">Pending: {pendingCount}</span>
                <span className="text-emerald-600">Done: {completedCount}</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <DropCardSkeleton />
              <DropCardSkeleton />
              <DropCardSkeleton />
            </div>
          ) : filteredDrops.length > 0 ? (
            <div className="space-y-3">
              {filteredDrops.map((drop) => (
                <DropCard key={drop.id} drop={drop} />
              ))}
            </div>
          ) : (
            <EmptyState
              type={
                activeTab === "completed"
                  ? "history"
                  : activeTab === "overdue"
                  ? "overdue"
                  : activeTab === "today"
                  ? "today"
                  : activeTab === "upcoming"
                  ? "upcoming"
                  : "drops"
              }
            />
          )}
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
