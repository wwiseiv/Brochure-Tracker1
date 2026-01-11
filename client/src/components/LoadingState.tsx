import { Skeleton } from "@/components/ui/skeleton";

export function DropCardSkeleton() {
  return (
    <div className="p-4 bg-card rounded-lg border border-border">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-48 mt-2" />
          <div className="flex items-center gap-4 mt-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-full rounded-lg" />
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-8" />
        </div>
        <DropCardSkeleton />
        <DropCardSkeleton />
      </div>
      
      <div className="flex gap-4">
        <Skeleton className="h-20 flex-1 rounded-lg" />
        <Skeleton className="h-20 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

export function DropDetailSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-24 mt-1" />
        </div>
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      
      <Skeleton className="h-24 w-full rounded-lg" />
      
      <div className="flex gap-3">
        <Skeleton className="h-12 flex-1 rounded-lg" />
        <Skeleton className="h-12 flex-1 rounded-lg" />
      </div>
    </div>
  );
}
