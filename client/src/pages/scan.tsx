import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { QRScanner } from "@/components/QRScanner";
import { BottomNav } from "@/components/BottomNav";
import { QrCode, ArrowLeft, Camera } from "lucide-react";

export default function ScanPage() {
  const [, navigate] = useLocation();
  const [showScanner, setShowScanner] = useState(false);

  const handleScanSuccess = (decodedText: string) => {
    setShowScanner(false);
    navigate(`/drops/new?brochureId=${encodeURIComponent(decodedText)}`);
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
          <span className="font-semibold">Scan Brochure</span>
        </div>
      </header>

      <main className="container max-w-md mx-auto px-4 py-8">
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
          
          <div className="mt-8 p-4 bg-muted rounded-lg w-full">
            <h3 className="font-medium mb-2">Tips for scanning</h3>
            <ul className="text-sm text-muted-foreground space-y-2 text-left">
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
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
