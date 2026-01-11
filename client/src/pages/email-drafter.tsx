import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Sparkles,
  Wand2,
  Copy,
  Check,
  Mail,
  Loader2,
  RefreshCw
} from "lucide-react";

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
  { value: "persuasive", label: "Persuasive" },
  { value: "urgent", label: "Urgent" },
];

const PURPOSE_OPTIONS = [
  { value: "follow-up", label: "Follow-up after visit" },
  { value: "introduction", label: "Introduction / First contact" },
  { value: "thank-you", label: "Thank you message" },
  { value: "reminder", label: "Reminder about our meeting" },
  { value: "proposal", label: "Proposal / Offer" },
  { value: "appointment", label: "Schedule appointment" },
];

export default function EmailDrafterPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [draft, setDraft] = useState("");
  const [polishedEmail, setPolishedEmail] = useState("");
  const [tone, setTone] = useState("professional");
  const [context, setContext] = useState("");
  const [copied, setCopied] = useState(false);
  
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState("");

  const polishMutation = useMutation({
    mutationFn: async (data: { draft: string; tone: string; context: string }) => {
      const res = await apiRequest("POST", "/api/email/polish", data);
      return res.json();
    },
    onSuccess: (data) => {
      setPolishedEmail(data.polishedEmail);
      toast({
        title: "Email polished!",
        description: "Your email has been professionally refined.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to polish email",
        variant: "destructive",
      });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { businessName: string; contactName: string; purpose: string; keyPoints: string; tone: string }) => {
      const res = await apiRequest("POST", "/api/email/generate", data);
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedEmail(data.email);
      toast({
        title: "Email generated!",
        description: "Your email has been created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate email",
        variant: "destructive",
      });
    },
  });

  const handlePolish = () => {
    if (!draft.trim()) {
      toast({
        title: "Draft required",
        description: "Please write a draft email first.",
        variant: "destructive",
      });
      return;
    }
    polishMutation.mutate({ draft, tone, context });
  };

  const handleGenerate = () => {
    if (!businessName.trim() || !purpose) {
      toast({
        title: "Missing information",
        description: "Please provide a business name and select a purpose.",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate({ businessName, contactName, purpose, keyPoints, tone });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied to clipboard!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">Email Drafter</h1>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <Tabs defaultValue="polish" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="polish" className="min-h-touch gap-2" data-testid="tab-polish">
              <Wand2 className="w-4 h-4" />
              Polish Draft
            </TabsTrigger>
            <TabsTrigger value="generate" className="min-h-touch gap-2" data-testid="tab-generate">
              <Sparkles className="w-4 h-4" />
              Generate New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="polish" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Write Your Draft</CardTitle>
                <CardDescription>
                  Write your email in your own words - AI will polish it professionally
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="draft">Your Draft Email</Label>
                  <Textarea
                    id="draft"
                    placeholder="Hey John, just wanted to follow up on our meeting yesterday. I think our payment processing solution would be perfect for your restaurant..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="min-h-[150px]"
                    data-testid="input-draft"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tone">Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger id="tone" data-testid="select-tone">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TONE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="context">Context (optional)</Label>
                    <Input
                      id="context"
                      placeholder="e.g., First meeting"
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      data-testid="input-context"
                    />
                  </div>
                </div>

                <Button
                  onClick={handlePolish}
                  disabled={polishMutation.isPending || !draft.trim()}
                  className="w-full min-h-touch gap-2"
                  data-testid="button-polish"
                >
                  {polishMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Polishing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      Polish Email
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {polishedEmail && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Polished Email
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePolish()}
                        disabled={polishMutation.isPending}
                        data-testid="button-repolish"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(polishedEmail)}
                        data-testid="button-copy-polished"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-background rounded-lg p-4 whitespace-pre-wrap text-sm">
                    {polishedEmail}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="generate" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Generate Email</CardTitle>
                <CardDescription>
                  Tell us about the business and we'll generate a professional email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      placeholder="Golden Gate Bistro"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      data-testid="input-business-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Name</Label>
                    <Input
                      id="contactName"
                      placeholder="Maria Santos"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      data-testid="input-contact-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">Email Purpose *</Label>
                  <Select value={purpose} onValueChange={setPurpose}>
                    <SelectTrigger id="purpose" data-testid="select-purpose">
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      {PURPOSE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keyPoints">Key Points (optional)</Label>
                  <Textarea
                    id="keyPoints"
                    placeholder="Mention the video brochure, discuss competitive rates, schedule a demo..."
                    value={keyPoints}
                    onChange={(e) => setKeyPoints(e.target.value)}
                    className="min-h-[80px]"
                    data-testid="input-key-points"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="generateTone">Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger id="generateTone" data-testid="select-generate-tone">
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !businessName.trim() || !purpose}
                  className="w-full min-h-touch gap-2"
                  data-testid="button-generate"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Email
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {generatedEmail && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Generated Email
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerate()}
                        disabled={generateMutation.isPending}
                        data-testid="button-regenerate"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generatedEmail)}
                        data-testid="button-copy-generated"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-background rounded-lg p-4 whitespace-pre-wrap text-sm">
                    {generatedEmail}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
