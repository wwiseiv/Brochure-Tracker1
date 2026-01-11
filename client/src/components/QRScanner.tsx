import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { X, Camera, SwitchCamera, AlertCircle } from "lucide-react";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  const startScanner = useCallback(async (cameraId?: string) => {
    if (!containerRef.current) return;
    
    try {
      setError(null);
      
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
        }
      }
      
      const html5QrCode = new Html5Qrcode("qr-reader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = html5QrCode;
      
      const availableCameras = await Html5Qrcode.getCameras();
      if (availableCameras.length === 0) {
        setError("No cameras found on this device");
        return;
      }
      
      setCameras(availableCameras);
      
      const targetCameraId = cameraId || availableCameras[0].id;
      const backCamera = availableCameras.find(
        (cam) => cam.label.toLowerCase().includes("back") || 
                 cam.label.toLowerCase().includes("rear") ||
                 cam.label.toLowerCase().includes("environment")
      );
      
      const selectedCamera = cameraId ? targetCameraId : (backCamera?.id || targetCameraId);
      
      await html5QrCode.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          onScanSuccess(decodedText);
          html5QrCode.stop().catch(() => {});
        },
        () => {}
      );
      
      setIsScanning(true);
    } catch (err) {
      console.error("Camera error:", err);
      setError(
        err instanceof Error 
          ? err.message 
          : "Failed to access camera. Please allow camera permissions."
      );
    }
  }, [onScanSuccess]);

  const switchCamera = useCallback(async () => {
    if (cameras.length <= 1) return;
    
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    await startScanner(cameras[nextIndex].id);
  }, [cameras, currentCameraIndex, startScanner]);

  useEffect(() => {
    startScanner();
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [startScanner]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="relative h-full flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <h2 className="text-white font-semibold text-lg">Scan Brochure QR</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 w-12 h-12"
            data-testid="button-close-scanner"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-full max-w-sm aspect-square">
            <div 
              id="qr-reader" 
              ref={containerRef}
              className="w-full h-full"
            />
            
            {!isScanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="flex flex-col items-center gap-4 text-white">
                  <Camera className="w-16 h-16 animate-pulse" />
                  <p className="text-sm">Initializing camera...</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <AlertCircle className="w-16 h-16 text-destructive" />
                  <p className="text-white text-sm">{error}</p>
                  <Button
                    onClick={() => startScanner()}
                    variant="secondary"
                    className="min-h-touch"
                    data-testid="button-retry-camera"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
            
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex flex-col items-center gap-4">
            <p className="text-white/80 text-sm text-center">
              Point at the QR code on the brochure
            </p>
            
            {cameras.length > 1 && (
              <Button
                variant="secondary"
                onClick={switchCamera}
                className="min-h-touch gap-2"
                data-testid="button-switch-camera"
              >
                <SwitchCamera className="w-5 h-5" />
                Switch Camera
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
