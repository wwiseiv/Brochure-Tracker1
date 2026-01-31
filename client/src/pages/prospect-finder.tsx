import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/BottomNav";
import { 
  ArrowLeft, 
  Search, 
  MapPin, 
  Sparkles,
  Building2,
  Phone,
  Globe,
  ChevronRight,
  Loader2
} from "lucide-react";

export default function ProspectFinderPage() {
  const [zipCode, setZipCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h1 className="text-lg font-semibold">Prospect Finder</h1>
          </div>
        </div>
      </header>

      <main className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">Find Local Businesses</h2>
              <p className="text-sm text-muted-foreground">
                AI-powered discovery in your territory
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">ZIP Code</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="Enter ZIP code"
                  className="pl-10"
                  data-testid="input-zip-code"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Business Type</label>
              <div className="flex flex-wrap gap-2">
                {["Restaurants", "Retail", "Services", "Healthcare", "Auto"].map((type) => (
                  <Badge
                    key={type}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10"
                    data-testid={`badge-type-${type.toLowerCase()}`}
                  >
                    {type}
                  </Badge>
                ))}
                <Badge variant="outline" className="cursor-pointer border-dashed">
                  + More
                </Badge>
              </div>
            </div>

            <Button 
              className="w-full gap-2"
              disabled={!zipCode || isSearching}
              data-testid="button-search-prospects"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Find Prospects
                </>
              )}
            </Button>
          </div>
        </Card>

        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="font-semibold mb-2">Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            AI-powered prospect discovery is being finalized. Enter a ZIP code above to search when ready.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
