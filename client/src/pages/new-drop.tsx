import { useState, useEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  MapPin, 
  Loader2, 
  CheckCircle2, 
  Building2,
  User,
  Phone,
  FileText,
  Calendar
} from "lucide-react";
import { addDays, format } from "date-fns";
import { BUSINESS_TYPES, type BusinessType } from "@shared/schema";
import { businessTypeLabels } from "@/components/BusinessTypeIcon";

const dropFormSchema = z.object({
  brochureId: z.string().min(1, "Brochure ID is required"),
  businessName: z.string().min(1, "Business name is required"),
  businessType: z.string().min(1, "Business type is required"),
  contactName: z.string().optional(),
  businessPhone: z.string().optional(),
  textNotes: z.string().optional(),
  followUpDays: z.string(),
});

type DropFormData = z.infer<typeof dropFormSchema>;

export default function NewDropPage() {
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const brochureId = searchParams.get("brochureId") || "";
  
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload();
  
  const [isLocating, setIsLocating] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceDuration, setVoiceDuration] = useState(0);

  const form = useForm<DropFormData>({
    resolver: zodResolver(dropFormSchema),
    defaultValues: {
      brochureId,
      businessName: "",
      businessType: "",
      contactName: "",
      businessPhone: "",
      textNotes: "",
      followUpDays: "3",
    },
  });

  const createDropMutation = useMutation({
    mutationFn: async (data: DropFormData & { 
      latitude?: number; 
      longitude?: number; 
      address?: string;
      voiceNoteUrl?: string;
      pickupScheduledFor?: string;
    }) => {
      const response = await apiRequest("POST", "/api/drops", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drops"] });
      toast({
        title: "Drop logged successfully!",
        description: `Follow-up scheduled for ${format(new Date(data.pickupScheduledFor), "MMM d, yyyy")}`,
      });
      navigate(`/drops/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to log drop",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const getLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support location services",
        variant: "destructive",
      });
      return;
    }

    setIsLocating(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            {
              headers: {
                "User-Agent": "BrochureDrop/1.0",
              },
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            const formattedAddress = data.display_name || "";
            setAddress(formattedAddress);
          }
        } catch (err) {
          console.error("Geocoding failed:", err);
        }
        
        setIsLocating(false);
      },
      (error) => {
        console.error("Location error:", error);
        toast({
          title: "Location failed",
          description: "Could not get your location. Please allow location access.",
          variant: "destructive",
        });
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [toast]);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const handleVoiceRecording = (blob: Blob, duration: number) => {
    setVoiceBlob(blob);
    setVoiceDuration(duration);
  };

  const onSubmit = async (data: DropFormData) => {
    let voiceNoteUrl: string | undefined;
    
    if (voiceBlob) {
      const uploadResult = await uploadFile(new File([voiceBlob], "voice-note.webm", { type: voiceBlob.type }));
      if (uploadResult) {
        voiceNoteUrl = uploadResult.objectPath;
      }
    }
    
    const followUpDays = parseInt(data.followUpDays) || 3;
    const pickupScheduledFor = addDays(new Date(), followUpDays).toISOString();
    
    createDropMutation.mutate({
      ...data,
      latitude: location?.lat,
      longitude: location?.lng,
      address,
      voiceNoteUrl,
      pickupScheduledFor,
    });
  };

  const isSubmitting = createDropMutation.isPending || isUploading;

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

      <main className="container max-w-md mx-auto px-4 py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Brochure ID</p>
                  <p className="font-mono font-semibold" data-testid="text-brochure-id">
                    {brochureId || "Manual Entry"}
                  </p>
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="brochureId"
                render={({ field }) => (
                  <FormItem className={brochureId ? "hidden" : ""}>
                    <FormLabel>Brochure ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., SP-2026-00147" 
                        {...field} 
                        data-testid="input-brochure-id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">Location</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={getLocation}
                  disabled={isLocating}
                  className="min-h-touch"
                  data-testid="button-refresh-location"
                >
                  {isLocating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </div>
              
              {address ? (
                <p className="text-sm" data-testid="text-address">{address}</p>
              ) : isLocating ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Getting location...
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Location not available
                </p>
              )}
            </Card>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Business Name
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter business name" 
                        className="min-h-touch"
                        {...field} 
                        data-testid="input-business-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="min-h-touch" data-testid="select-business-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BUSINESS_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {businessTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Contact Name (optional)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Person you spoke with" 
                        className="min-h-touch"
                        {...field} 
                        data-testid="input-contact-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Business Phone (optional)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="tel"
                        placeholder="(555) 123-4567" 
                        className="min-h-touch"
                        {...field} 
                        data-testid="input-business-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Voice Note (optional)
              </Label>
              <VoiceRecorder
                onRecordingComplete={handleVoiceRecording}
                onDelete={() => setVoiceBlob(null)}
              />
            </div>

            <FormField
              control={form.control}
              name="textNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Text Notes (optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional notes about this drop..."
                      className="min-h-[100px] resize-none"
                      {...field} 
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="followUpDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Follow-up in
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="min-h-touch" data-testid="select-follow-up">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="2">2 days</SelectItem>
                      <SelectItem value="3">3 days (recommended)</SelectItem>
                      <SelectItem value="5">5 days</SelectItem>
                      <SelectItem value="7">1 week</SelectItem>
                      <SelectItem value="14">2 weeks</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pickup scheduled for{" "}
                    <span className="font-medium text-foreground">
                      {format(
                        addDays(new Date(), parseInt(form.watch("followUpDays") || "3")),
                        "EEEE, MMM d"
                      )}
                    </span>
                  </p>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full min-h-touch-lg text-lg font-semibold"
              disabled={isSubmitting}
              data-testid="button-submit-drop"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Log This Drop
                </>
              )}
            </Button>
          </form>
        </Form>
      </main>

      <BottomNav />
    </div>
  );
}
