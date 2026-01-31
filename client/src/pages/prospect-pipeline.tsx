import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { 
  ArrowLeft, 
  TrendingUp,
  Users,
  Phone,
  CheckCircle2,
  Clock,
  Target
} from "lucide-react";

const pipelineStages = [
  { id: "discovered", label: "Discovered", count: 0, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  { id: "contacted", label: "Contacted", count: 0, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
  { id: "qualified", label: "Qualified", count: 0, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
  { id: "won", label: "Won", count: 0, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
];

export default function ProspectPipelinePage() {
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
            <TrendingUp className="w-5 h-5 text-teal-600" />
            <h1 className="text-lg font-semibold">My Pipeline</h1>
          </div>
        </div>
      </header>

      <main className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {pipelineStages.map((stage) => (
            <Card key={stage.id} className="p-4" data-testid={`card-stage-${stage.id}`}>
              <div className={`w-10 h-10 rounded-lg ${stage.bg} flex items-center justify-center mb-2`}>
                <span className={`font-bold text-lg ${stage.color}`}>{stage.count}</span>
              </div>
              <p className="text-sm font-medium">{stage.label}</p>
            </Card>
          ))}
        </div>

        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-teal-600" />
          </div>
          <h3 className="font-semibold mb-2">No Prospects Yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
            Start finding businesses in your territory to build your pipeline.
          </p>
          <Link href="/prospects/search">
            <Button className="gap-2" data-testid="button-find-prospects">
              <Target className="w-4 h-4" />
              Find Prospects
            </Button>
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
