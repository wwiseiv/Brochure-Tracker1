import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QrCode, MapPin, Mic, Bell, CheckCircle2, ArrowRight } from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "Scan & Drop",
    description: "Scan the QR code on any brochure to instantly log a new drop with GPS location",
  },
  {
    icon: MapPin,
    title: "Auto Location",
    description: "GPS automatically captures business address and suggests nearby locations",
  },
  {
    icon: Mic,
    title: "Voice Notes",
    description: "Record voice notes with AI-powered transcription for quick context capture",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Get notified when it's time to pick up brochures and follow up with leads",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <QrCode className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">BrochureDrop</span>
          </div>
          <a href="/api/login">
            <Button className="min-h-touch" data-testid="button-login-header">
              Log In
            </Button>
          </a>
        </div>
      </header>

      <main className="container max-w-md mx-auto px-4 py-8">
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <CheckCircle2 className="w-4 h-4" />
            Field Tracking Made Simple
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            Track Video Brochure
            <span className="block text-primary">Deployments</span>
          </h1>
          
          <p className="text-muted-foreground text-lg mb-8">
            Scan, drop, and track your video brochures with automatic GPS location, voice notes, and pickup reminders.
          </p>
          
          <a href="/api/login">
            <Button size="lg" className="w-full min-h-touch-lg gap-2" data-testid="button-get-started">
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Button>
          </a>
        </section>

        <section className="space-y-4 mb-12">
          <h2 className="text-lg font-semibold text-center mb-6">How It Works</h2>
          
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </Card>
            );
          })}
        </section>

        <section className="text-center py-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">
            Built for SignaPay field representatives
          </p>
          <a href="/api/login">
            <Button variant="outline" className="w-full min-h-touch gap-2" data-testid="button-login-bottom">
              Log In to Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </a>
        </section>
      </main>
    </div>
  );
}
