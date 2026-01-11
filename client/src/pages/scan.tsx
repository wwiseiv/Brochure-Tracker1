import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRScanner } from "@/components/QRScanner";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { QrCode, ArrowLeft, Camera, Keyboard, ArrowRight } from "lucide-react";

export default function ScanPage() {
  const [, navigate] = useLocation();
  const [showScanner, setShowScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualBrochureId, setManualBrochureId] = useState("");

  const handleScanSuccess = (decodedText: string) => {
    setShowScanner(false);
    navigate(`/drops/new?brochureId=${encodeURIComponent(decodedText)}`);
  };

  const handleManualSubmit = () => {
    if (manualBrochureId.trim()) {
      navigate(`/drops/new?brochureId=${encodeURIComponent(manualBrochureId.trim())}`);
    }
  };

  const handleSkipBrochureId = () => {
    navigate(`/drops/new`);
  };

  if (showScanner) {
    return (
      <QRScanner
        onScanSuccess={handleScanSuccess}
        onClose={() => setShowScanner(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md mx-auto px-4 h-14 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-semibold">New Drop</span>
        </div>
      </header>

      <main className="container max-w-md mx-auto px-4 py-8 space-y-6">
        {!showManualEntry ? (
          <>
            <div className="flex flex-col items-center text-center">
              <div className="w-32 h-32 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <QrCode className="w-16 h-16 text-primary" />
              </div>
              
              <h1 className="text-2xl font-bold mb-2">Scan Brochure QR Code</h1>
              <p className="text-muted-foreground mb-8 max-w-xs">
                Point your camera at the QR code on the video brochure to log a new drop
              </p>
              
              <Button
                size="lg"
                className="w-full min-h-touch-lg gap-3 text-lg font-semibold"
                onClick={() => setShowScanner(true)}
                data-testid="button-open-camera"
              >
                <Camera className="w-6 h-6" />
                Open Camera
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or
                </span>
              </div>
            </div>

            <Card className="p-4">
              <div className="flex flex-col items-center text-center">
                <Keyboard className="w-8 h-8 text-muted-foreground mb-3" />
                <h3 className="font-medium mb-1">No QR Code?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter the brochure ID manually or skip to log a drop without a brochure
                </p>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    className="flex-1 min-h-touch"
                    onClick={() => setShowManualEntry(true)}
                    data-testid="button-manual-entry"
                  >
                    Enter ID Manually
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 min-h-touch"
                    onClick={handleSkipBrochureId}
                    data-testid="button-skip-brochure"
                  >
                    Skip & Log Drop
                  </Button>
                </div>
              </div>
            </Card>
            
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Tips for scanning</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Hold your phone steady about 6-12 inches from the QR code
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Make sure the QR code is well-lit and not damaged
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Center the QR code within the scanning box
                </li>
              </ul>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Keyboard className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-xl font-bold mb-2">Enter Brochure ID</h1>
              <p className="text-sm text-muted-foreground">
                Type the brochure ID printed on the device
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="brochure-id">Brochure ID</Label>
              <Input
                id="brochure-id"
                placeholder="e.g., BR-12345 or scan number"
                value={manualBrochureId}
                onChange={(e) => setManualBrochureId(e.target.value)}
                className="min-h-touch text-lg"
                autoFocus
                data-testid="input-brochure-id"
              />
            </div>

            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full min-h-touch-lg gap-2"
                onClick={handleManualSubmit}
                disabled={!manualBrochureId.trim()}
                data-testid="button-submit-brochure-id"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </Button>
              
              <Button
                variant="ghost"
                className="w-full min-h-touch"
                onClick={() => setShowManualEntry(false)}
                data-testid="button-back-to-scan"
              >
                Back to Scanner
              </Button>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2 text-sm">Where to find the Brochure ID</h3>
              <p className="text-sm text-muted-foreground">
                The brochure ID is typically printed on the back of the video brochure device, 
                near the QR code or on a label. It may be labeled as "Serial No.", "ID", or "Product Code".
              </p>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
