import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Upload, Building2, MapPin, Camera } from "lucide-react";
import pcbLogoFullColor from "@/assets/pcb_logo_fullcolor.png";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[\d\s\-\(\)]+$/, "Please enter a valid phone number"),
  company: z.string().optional(),
  territory: z.string().optional(),
  profilePhotoUrl: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export default function CompleteProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const profilePhotoRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      territory: "",
      profilePhotoUrl: "",
    },
  });

  const uploadFile = async (file: File, type: "photo" | "logo"): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/uploads/proxy", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Upload failed");
      }
      
      const data = await res.json();
      return data.objectPath;
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Could not upload image. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    setUploadingPhoto(true);
    const url = await uploadFile(file, "photo");
    setUploadingPhoto(false);
    
    if (url) {
      form.setValue("profilePhotoUrl", url);
    }
  };

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await apiRequest("PUT", "/api/me/profile", data);
      return res.json();
    },
    onSuccess: async () => {
      toast({
        title: "Profile completed",
        description: "Welcome to PCBancard! Your profile has been saved.",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/me/role"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/me/member"] });
      await queryClient.refetchQueries({ queryKey: ["/api/me/role"] });
      await queryClient.refetchQueries({ queryKey: ["/api/me/member"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(data);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange(formatted);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center justify-center">
          <img src={pcbLogoFullColor} alt="PCBancard" className="h-7 w-auto" />
        </div>
      </header>

      <main className="flex-1 container max-w-lg mx-auto px-4 py-8">
        <Card className="w-full">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Complete Your Profile</CardTitle>
            <CardDescription>
              Please provide your information to get started. This helps us personalize your experience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John"
                            className="min-h-[48px]"
                            data-testid="input-first-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Smith"
                            className="min-h-[48px]"
                            data-testid="input-last-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          className="min-h-[48px]"
                          data-testid="input-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone *</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="(555) 123-4567"
                          className="min-h-[48px]"
                          data-testid="input-phone"
                          value={field.value}
                          onChange={(e) => handlePhoneChange(e, field.onChange)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-6">
                  <p className="text-sm text-muted-foreground mb-4">Optional Information</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            Company
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your company"
                              className="min-h-[48px]"
                              data-testid="input-company"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="territory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            Territory
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Sales region"
                              className="min-h-[48px]"
                              data-testid="input-territory"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <p className="text-sm text-muted-foreground mb-4">Profile Photo (Optional)</p>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Camera className="w-4 h-4" />
                      Your Photo
                    </Label>
                    <div 
                      className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center min-h-[120px] cursor-pointer hover-elevate transition-colors"
                      onClick={() => profilePhotoRef.current?.click()}
                      data-testid="upload-profile-photo"
                    >
                      {profilePhotoPreview ? (
                        <img 
                          src={profilePhotoPreview} 
                          alt="Profile preview" 
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                          <p className="text-xs text-muted-foreground text-center">
                            {uploadingPhoto ? "Uploading..." : "Click to upload your photo"}
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      ref={profilePhotoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoSelect}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full min-h-[48px] text-base font-semibold"
                  disabled={updateProfile.isPending || uploadingPhoto}
                  data-testid="button-submit-profile"
                >
                  {updateProfile.isPending ? "Saving..." : "Complete Profile"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
