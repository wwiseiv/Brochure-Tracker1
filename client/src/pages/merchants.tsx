import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BusinessTypeIcon, businessTypeLabels } from "@/components/BusinessTypeIcon";
import { BottomNav } from "@/components/BottomNav";
import { ExportDialog } from "@/components/ExportDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Search,
  ChevronRight,
  Phone,
  TrendingUp,
  MapPin,
  Store,
} from "lucide-react";
import { format } from "date-fns";
import type { Merchant, BusinessType } from "@shared/schema";

type SortOption = "lastVisit" | "leadScore" | "name" | "drops";

function MerchantCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
        <Skeleton className="w-5 h-5" />
      </div>
    </Card>
  );
}

function MerchantCard({ merchant }: { merchant: Merchant }) {
  const leadScoreColor = (score: number | null) => {
    if (!score) return "bg-muted text-muted-foreground";
    if (score >= 80) return "bg-emerald-100 text-emerald-800";
    if (score >= 50) return "bg-amber-100 text-amber-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <Link href={`/merchants/${merchant.id}`}>
      <Card 
        className="p-4 hover-elevate cursor-pointer"
        data-testid={`card-merchant-${merchant.id}`}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BusinessTypeIcon 
              type={merchant.businessType as BusinessType || "other"} 
              className="w-5 h-5 text-primary" 
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{merchant.businessName}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {merchant.businessType 
                ? businessTypeLabels[merchant.businessType as BusinessType] 
                : "Business"}
              {merchant.contactName && ` • ${merchant.contactName}`}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {merchant.leadScore !== null && (
                <Badge variant="secondary" className={leadScoreColor(merchant.leadScore)}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Score: {merchant.leadScore}
                </Badge>
              )}
              <Badge variant="outline">
                {merchant.totalDrops || 0} drops
              </Badge>
              {(merchant.totalConversions || 0) > 0 && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                  {merchant.totalConversions} converted
                </Badge>
              )}
            </div>
            {merchant.lastVisitAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Last visit: {format(new Date(merchant.lastVisitAt), "MMM d, yyyy")}
              </p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-2" />
        </div>
      </Card>
    </Link>
  );
}

export default function MerchantsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("lastVisit");

  const { data: merchants, isLoading } = useQuery<Merchant[]>({
    queryKey: ["/api/merchants"],
  });

  const filteredAndSortedMerchants = useMemo(() => {
    if (!merchants) return [];

    let result = [...merchants];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.businessName.toLowerCase().includes(query) ||
          m.contactName?.toLowerCase().includes(query) ||
          m.address?.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "leadScore":
          return (b.leadScore || 0) - (a.leadScore || 0);
        case "name":
          return a.businessName.localeCompare(b.businessName);
        case "drops":
          return (b.totalDrops || 0) - (a.totalDrops || 0);
        case "lastVisit":
        default:
          const aDate = a.lastVisitAt ? new Date(a.lastVisitAt).getTime() : 0;
          const bDate = b.lastVisitAt ? new Date(b.lastVisitAt).getTime() : 0;
          return bDate - aDate;
      }
    });

    return result;
  }, [merchants, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Store className="w-5 h-5 text-primary" />
          <span className="font-semibold">Merchants</span>
        </div>
      </header>

      <main className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-4 space-y-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Tooltip delayDuration={700}>
              <TooltipTrigger asChild>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Search merchants</p>
              </TooltipContent>
            </Tooltip>
            <Input
              placeholder="Search merchants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 min-h-touch"
              data-testid="input-search-merchants"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Tooltip delayDuration={700}>
              <TooltipTrigger asChild>
                <span>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger 
                      className="w-[160px] min-h-touch" 
                      data-testid="select-sort-merchants"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lastVisit">Last Visit</SelectItem>
                      <SelectItem value="leadScore">Lead Score</SelectItem>
                      <SelectItem value="name">Name (A-Z)</SelectItem>
                      <SelectItem value="drops">Total Drops</SelectItem>
                    </SelectContent>
                  </Select>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sort merchants</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {filteredAndSortedMerchants.length}{" "}
            {filteredAndSortedMerchants.length === 1 ? "merchant" : "merchants"}
          </div>
          <ExportDialog
            title="Export Merchants"
            description="Download your merchant contact data as a spreadsheet file."
            exportEndpoint="/api/merchants/export"
            buttonLabel="Export"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <MerchantCardSkeleton />
            <MerchantCardSkeleton />
            <MerchantCardSkeleton />
          </div>
        ) : filteredAndSortedMerchants.length > 0 ? (
          <div className="space-y-3">
            {filteredAndSortedMerchants.map((merchant) => (
              <MerchantCard key={merchant.id} merchant={merchant} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? "No merchants found" : "No merchants yet"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery
                ? "Try a different search term"
                : "Merchants will appear here as you make drops"}
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
