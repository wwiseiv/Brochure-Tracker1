import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Camera,
  Upload,
  Loader2,
  ArrowLeft,
  Check,
  AlertCircle,
  Building2,
  User,
  Phone,
  Mail,
  Globe,
  MapPin,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ExtractedCardData {
  businessName?: string;
  contactName?: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  businessType?: string;
  confidence: number;
  extractionNotes: string[];
}

export default function BusinessCardScanner() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedCardData | null>(null);
  const [editedData, setEditedData] = useState<ExtractedCardData | null>(null);

  const scanMutation = useMutation({
    mutationFn: async ({ imageData, mimeType }: { imageData: string; mimeType: string }) => {
      const response = await apiRequest("POST", "/api/prospects/scan-card", {
        imageData,
        mimeType,
      });
      return await response.json();
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        setExtractedData(result.data);
        setEditedData(result.data);
        toast({
          title: "Card Scanned Successfully",
          description: `Confidence: ${result.data.confidence}%`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Scan Failed",
        description: error.message || "Could not read the business card. Please try again with a clearer image.",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (cardData: ExtractedCardData) => {
      const response = await apiRequest("POST", "/api/prospects/from-card", { cardData });
      return await response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prospects/pipeline"] });
      toast({
        title: "Prospect Created!",
        description: `${result.prospect.businessName} has been added to your pipeline.`,
      });
      setLocation("/prospects/pipeline");
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to create prospect. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image under 10MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setExtractedData(null);
      setEditedData(null);

      const base64Data = dataUrl.split(",")[1];
      scanMutation.mutate({ imageData: base64Data, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setImagePreview(null);
    setExtractedData(null);
    setEditedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = () => {
    if (!editedData?.businessName) {
      toast({
        title: "Business Name Required",
        description: "Please enter a business name before saving.",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(editedData);
  };

  const updateField = (field: keyof ExtractedCardData, value: string) => {
    if (editedData) {
      setEditedData({ ...editedData, [field]: value });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 p-4">
          <Tooltip delayDuration={700}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/prospects/pipeline")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Go back</p>
            </TooltipContent>
          </Tooltip>
          <div>
            <h1 className="font-semibold">Scan Business Card</h1>
            <p className="text-xs text-muted-foreground">Add prospect from card photo</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-24">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
          data-testid="input-file-capture"
        />

        {!imagePreview ? (
          <Card className="p-8 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Capture Business Card</h2>
              <p className="text-muted-foreground text-sm">
                Take a photo of a business card to automatically extract contact information
              </p>
            </div>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <Tooltip delayDuration={700}>
                <TooltipTrigger asChild>
                  <Button onClick={handleCapture} className="w-full" data-testid="button-take-photo">
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Take photo of business card</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={700}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleCapture}
                    className="w-full"
                    data-testid="button-upload-photo"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upload business card image</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                <Sparkles className="w-3 h-3 inline mr-1" />
                AI-powered OCR extracts name, phone, email, and address
              </p>
            </div>
          </Card>
        ) : (
          <>
            <Card className="p-4">
              <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                <img
                  src={imagePreview}
                  alt="Business card"
                  className="w-full h-full object-contain"
                />
                {scanMutation.isPending && (
                  <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">Analyzing card with AI...</p>
                    <Progress value={66} className="w-32" />
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <Tooltip delayDuration={700}>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={handleReset} className="flex-1" data-testid="button-retake">
                      Retake
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Retake photo</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip delayDuration={700}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={handleCapture}
                      className="flex-1"
                      data-testid="button-choose-another"
                    >
                      Choose Another
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Choose another image</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </Card>

            {extractedData && editedData && (
              <Card className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Extracted Information</h3>
                  <Badge
                    variant={extractedData.confidence >= 70 ? "default" : "secondary"}
                    className={extractedData.confidence >= 70 ? "bg-green-600" : ""}
                  >
                    {extractedData.confidence}% confidence
                  </Badge>
                </div>

                {extractedData.extractionNotes.length > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg flex gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-amber-800 dark:text-amber-200">
                      {extractedData.extractionNotes.map((note, i) => (
                        <p key={i}>{note}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Business Name *
                      </Label>
                      <Input
                        value={editedData.businessName || ""}
                        onChange={(e) => updateField("businessName", e.target.value)}
                        placeholder="Company name"
                        data-testid="input-business-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Contact Name
                      </Label>
                      <Input
                        value={editedData.contactName || ""}
                        onChange={(e) => updateField("contactName", e.target.value)}
                        placeholder="Full name"
                        data-testid="input-contact-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Title
                      </Label>
                      <Input
                        value={editedData.title || ""}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder="Job title"
                        data-testid="input-title"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Phone
                        </Label>
                        <Input
                          value={editedData.phone || ""}
                          onChange={(e) => updateField("phone", e.target.value)}
                          placeholder="555-123-4567"
                          type="tel"
                          data-testid="input-phone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Email
                        </Label>
                        <Input
                          value={editedData.email || ""}
                          onChange={(e) => updateField("email", e.target.value)}
                          placeholder="email@example.com"
                          type="email"
                          data-testid="input-email"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Website
                      </Label>
                      <Input
                        value={editedData.website || ""}
                        onChange={(e) => updateField("website", e.target.value)}
                        placeholder="www.example.com"
                        data-testid="input-website"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Address
                      </Label>
                      <Input
                        value={editedData.addressLine1 || ""}
                        onChange={(e) => updateField("addressLine1", e.target.value)}
                        placeholder="Street address"
                        className="mb-2"
                        data-testid="input-address"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          value={editedData.city || ""}
                          onChange={(e) => updateField("city", e.target.value)}
                          placeholder="City"
                          data-testid="input-city"
                        />
                        <Input
                          value={editedData.state || ""}
                          onChange={(e) => updateField("state", e.target.value)}
                          placeholder="State"
                          maxLength={2}
                          data-testid="input-state"
                        />
                        <Input
                          value={editedData.zipCode || ""}
                          onChange={(e) => updateField("zipCode", e.target.value)}
                          placeholder="ZIP"
                          data-testid="input-zip"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </main>

      {extractedData && editedData && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Tooltip delayDuration={700}>
            <TooltipTrigger asChild>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !editedData.businessName}
                className="w-full"
                data-testid="button-save-prospect"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Add to My Pipeline
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Save prospect to pipeline</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
