import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User } from "lucide-react";
import pcbLogoFullColor from "@/assets/pcb_logo_fullcolor.png";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[\d\s\-\(\)]+$/, "Please enter a valid phone number"),
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

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  });

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
      await queryClient.refetchQueries({ queryKey: ["/api/me/role"] });
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

      <main className="flex-1 container max-w-md mx-auto px-4 py-8 flex items-center justify-center">
        <Card className="w-full">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Complete Your Profile</CardTitle>
            <CardDescription>
              Please provide your contact information to get started. This helps us personalize your experience and enables important notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your first name"
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
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your last name"
                          className="min-h-[48px]"
                          data-testid="input-last-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
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
                      <FormLabel>Phone</FormLabel>
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

                <Button
                  type="submit"
                  className="w-full min-h-[48px] text-base font-semibold"
                  disabled={updateProfile.isPending}
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
