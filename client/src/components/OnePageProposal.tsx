import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileOutput,
  Globe,
  Upload,
  Package,
  User,
  Sparkles,
  FileText,
  AlertTriangle,
  Lock,
  Clock,
} from "lucide-react";

interface TemplateMetadata {
  templateId: string;
  displayName: string;
  category: "Savings Proposals" | "Referral" | "Promotions" | "Marketing";
  description: string;
  thumbnailUrl: string;
  pdfPath: string;
}

const TEMPLATES: TemplateMetadata[] = [
  {
    templateId: "exclusive-offer-standard",
    displayName: "Exclusive Offer (Standard)",
    category: "Savings Proposals",
    description: "Savings breakdown with equipment recommendations and contact info",
    thumbnailUrl: "/one-page-templates/thumb-exclusive-offer-standard.png",
    pdfPath: "/one-page-templates/template-1-exclusive-offer-standard.pdf",
  },
  {
    templateId: "exclusive-offer-qr",
    displayName: "Exclusive Offer (QR Code)",
    category: "Savings Proposals",
    description: "Savings proposal with QR code for video offer",
    thumbnailUrl: "/one-page-templates/thumb-exclusive-offer-qr.png",
    pdfPath: "/one-page-templates/template-2-exclusive-offer-qr.pdf",
  },
  {
    templateId: "referral-program-client",
    displayName: "Referral Program (Client-Facing)",
    category: "Referral",
    description: "Client-facing pitch for enrolled agent referral partners",
    thumbnailUrl: "/one-page-templates/thumb-referral-program-client.png",
    pdfPath: "/one-page-templates/template-3-referral-program-client.pdf",
  },
  {
    templateId: "enrolled-agent-referral",
    displayName: "Enrolled Agent Referral",
    category: "Referral",
    description: "Bold headline-focused referral opportunity pitch",
    thumbnailUrl: "/one-page-templates/thumb-enrolled-agent-referral.png",
    pdfPath: "/one-page-templates/template-4-enrolled-agent-referral.pdf",
  },
  {
    templateId: "free-payroll",
    displayName: "Free Payroll for 12 Months",
    category: "Promotions",
    description: "Promotional flyer for free payroll offering",
    thumbnailUrl: "/one-page-templates/thumb-free-payroll.png",
    pdfPath: "/one-page-templates/template-5-free-payroll.pdf",
  },
  {
    templateId: "business-grade-audit",
    displayName: "What's Your Business Grade?",
    category: "Marketing",
    description: "Free marketing audit offer flyer",
    thumbnailUrl: "/one-page-templates/thumb-business-grade-audit.png",
    pdfPath: "/one-page-templates/template-6-business-grade-audit.pdf",
  },
  {
    templateId: "video-brochure-5min",
    displayName: "The Best 5 Minutes",
    category: "Marketing",
    description: "Video brochure offer flyer",
    thumbnailUrl: "/one-page-templates/thumb-video-brochure-5min.png",
    pdfPath: "/one-page-templates/template-7-video-brochure-5min.pdf",
  },
];

const STEP_LABELS = [
  "Template",
  "Merchant Info",
  "Upload Docs",
  "Equipment",
  "Contact Info",
  "Generate",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Savings Proposals": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Referral": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Promotions": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Marketing": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

export function OnePageProposal() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const [merchantName, setMerchantName] = useState("");
  const [merchantWebsite, setMerchantWebsite] = useState("");
  const [generationMode, setGenerationMode] = useState<"template-fill" | "ai-custom">("template-fill");

  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactInitialized, setContactInitialized] = useState(false);

  useEffect(() => {
    if (user && !contactInitialized) {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
      setContactName(fullName || "");
      setContactEmail(user.email || "");
      setContactInitialized(true);
    }
  }, [user, contactInitialized]);

  const selectedTemplate = TEMPLATES.find((t) => t.templateId === selectedTemplateId);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return !!selectedTemplateId;
      case 1:
        return merchantName.trim().length > 0;
      case 2:
      case 3:
        return true;
      case 4:
        return contactName.trim().length > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5 && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const contactWarnings: string[] = [];
  if (!contactEmail.trim()) contactWarnings.push("Email is missing");
  if (!contactPhone.trim()) contactWarnings.push("Phone is missing");
  if (!contactTitle.trim()) contactWarnings.push("Title is missing");

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-6" data-testid="one-page-stepper">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex items-center">
          <button
            onClick={() => {
              if (i < currentStep) setCurrentStep(i);
            }}
            disabled={i > currentStep}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              i === currentStep
                ? "bg-primary text-primary-foreground"
                : i < currentStep
                  ? "bg-primary/20 text-primary cursor-pointer"
                  : "bg-muted text-muted-foreground"
            }`}
            data-testid={`step-indicator-${i}`}
          >
            {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
          </button>
          {i < 5 && (
            <div
              className={`w-4 sm:w-8 h-0.5 ${
                i < currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStepTitle = () => {
    const titles = [
      { icon: <FileOutput className="w-5 h-5" />, label: "Choose a Template" },
      { icon: <Globe className="w-5 h-5" />, label: "Merchant Information" },
      { icon: <Upload className="w-5 h-5" />, label: "Upload Documents" },
      { icon: <Package className="w-5 h-5" />, label: "Choose Equipment" },
      { icon: <User className="w-5 h-5" />, label: "Your Contact Info" },
      { icon: <FileText className="w-5 h-5" />, label: "Generate Proposal" },
    ];
    const t = titles[currentStep];
    return (
      <div className="flex items-center gap-2 mb-4" data-testid="step-header">
        {t.icon}
        <h2 className="text-lg font-semibold" data-testid="text-step-title">{t.label}</h2>
        <span className="text-sm text-muted-foreground ml-auto" data-testid="text-step-counter">
          Step {currentStep + 1} of 6
        </span>
      </div>
    );
  };

  const renderStep0_TemplateSelector = () => (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Select a professional template for your one-page proposal or flyer.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TEMPLATES.map((template) => (
          <Card
            key={template.templateId}
            className={`cursor-pointer transition-all overflow-visible ${
              selectedTemplateId === template.templateId
                ? "ring-2 ring-primary"
                : "hover-elevate"
            }`}
            onClick={() => setSelectedTemplateId(template.templateId)}
            data-testid={`template-card-${template.templateId}`}
          >
            <CardContent className="p-2">
              <div className="relative aspect-[3/4] mb-2 rounded overflow-hidden bg-muted">
                <img
                  src={template.thumbnailUrl}
                  alt={template.displayName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {selectedTemplateId === template.templateId && (
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                    <div className="bg-primary text-primary-foreground rounded-full p-1.5">
                      <Check className="w-4 h-4" />
                    </div>
                  </div>
                )}
              </div>
              <Badge
                className={`text-[10px] mb-1 no-default-hover-elevate no-default-active-elevate ${CATEGORY_COLORS[template.category] || ""}`}
              >
                {template.category}
              </Badge>
              <p className="text-xs font-medium leading-tight">
                {template.displayName}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {template.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderStep1_MerchantInfo = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter the merchant&apos;s business details. The name will appear on the proposal.
      </p>

      {selectedTemplate && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          <FileOutput className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm">
            Template: <span className="font-medium">{selectedTemplate.displayName}</span>
          </span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="merchant-name">Business Name *</Label>
        <Input
          id="merchant-name"
          placeholder="e.g. Bob's Marine"
          value={merchantName}
          onChange={(e) => setMerchantName(e.target.value)}
          data-testid="input-merchant-name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="merchant-website">Website URL (optional)</Label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="merchant-website"
            placeholder="https://example.com"
            value={merchantWebsite}
            onChange={(e) => setMerchantWebsite(e.target.value)}
            className="pl-10"
            type="url"
            data-testid="input-merchant-website"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {generationMode === "ai-custom"
            ? "AI will use this to tailor the proposal messaging to their industry"
            : "Used in AI-Custom mode to tailor messaging"}
        </p>
      </div>

      <div className="space-y-3">
        <Label>Generation Mode</Label>
        <RadioGroup
          value={generationMode}
          onValueChange={(v) => setGenerationMode(v as "template-fill" | "ai-custom")}
          className="space-y-2"
        >
          <label
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              generationMode === "template-fill" ? "border-primary bg-primary/5" : "border-border"
            }`}
            data-testid="radio-template-fill"
          >
            <RadioGroupItem value="template-fill" className="mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Template-Fill</span>
                <Badge variant="secondary" className="text-[10px]">Fast</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fills your data directly into the template — fast and reliable
              </p>
            </div>
          </label>
          <label
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              generationMode === "ai-custom" ? "border-primary bg-primary/5" : "border-border"
            }`}
            data-testid="radio-ai-custom"
          >
            <RadioGroupItem value="ai-custom" className="mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">AI-Custom</span>
                <Badge variant="secondary" className="text-[10px]">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI customizes the copy for the merchant&apos;s business type
              </p>
            </div>
          </label>
        </RadioGroup>
      </div>
    </div>
  );

  const renderStep2_UploadDocs = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload analysis documents to include real savings numbers on the proposal.
      </p>
      <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25">
        <div className="p-3 rounded-full bg-muted">
          <Clock className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Coming in Phase 2</p>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Upload merchant statements, dual pricing analysis, and interchange plus analysis PDFs to include specific savings numbers.
        </p>
      </div>
    </div>
  );

  const renderStep3_Equipment = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select equipment to recommend on the proposal.
      </p>
      <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25">
        <div className="p-3 rounded-full bg-muted">
          <Clock className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Coming in Phase 2</p>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Equipment IQ integration will let you pick equipment recommendations to feature on the proposal.
        </p>
      </div>
    </div>
  );

  const renderStep4_ContactInfo = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        This information will appear on the generated proposal. Verify it&apos;s correct before generating.
      </p>

      {contactWarnings.length > 0 && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
            {contactWarnings.join(", ")} — the proposal will still generate, but your contact details may be incomplete.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="contact-name">Full Name *</Label>
          <Input
            id="contact-name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Your full name"
            data-testid="input-contact-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-title">Title</Label>
          <Input
            id="contact-title"
            value={contactTitle}
            onChange={(e) => setContactTitle(e.target.value)}
            placeholder="e.g. Local Payments Expert"
            data-testid="input-contact-title"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-phone">Phone</Label>
          <Input
            id="contact-phone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="(555) 123-4567"
            type="tel"
            data-testid="input-contact-phone"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="you@pcbancard.com"
            type="email"
            data-testid="input-contact-email"
          />
        </div>
      </div>
    </div>
  );

  const renderStep5_Generate = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review your selections and generate the one-page proposal PDF.
      </p>

      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-muted/50 space-y-1" data-testid="summary-template">
          <p className="text-xs text-muted-foreground">Template</p>
          <p className="text-sm font-medium" data-testid="text-summary-template">{selectedTemplate?.displayName || "—"}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 space-y-1" data-testid="summary-merchant">
          <p className="text-xs text-muted-foreground">Merchant</p>
          <p className="text-sm font-medium" data-testid="text-summary-merchant">{merchantName || "—"}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 space-y-1" data-testid="summary-mode">
          <p className="text-xs text-muted-foreground">Mode</p>
          <p className="text-sm font-medium flex items-center gap-2" data-testid="text-summary-mode">
            {generationMode === "ai-custom" ? (
              <>
                <Sparkles className="w-4 h-4" /> AI-Custom
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" /> Template-Fill
              </>
            )}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 space-y-1" data-testid="summary-agent">
          <p className="text-xs text-muted-foreground">Agent</p>
          <p className="text-sm font-medium" data-testid="text-summary-agent">{contactName || "—"}</p>
          {contactTitle && <p className="text-xs text-muted-foreground">{contactTitle}</p>}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-8 gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25">
        <div className="p-3 rounded-full bg-muted">
          <Lock className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">PDF Generation Coming in Phase 2</p>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          The generate button will create a professional one-page PDF with your data overlaid on the selected template.
        </p>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderStep0_TemplateSelector();
      case 1: return renderStep1_MerchantInfo();
      case 2: return renderStep2_UploadDocs();
      case 3: return renderStep3_Equipment();
      case 4: return renderStep4_ContactInfo();
      case 5: return renderStep5_Generate();
      default: return null;
    }
  };

  return (
    <div data-testid="one-page-proposal">
      {renderStepIndicator()}
      {renderStepTitle()}
      {renderCurrentStep()}

      <div className="flex items-center justify-between gap-3 mt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
          data-testid="button-step-back"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        {currentStep < 5 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            data-testid="button-step-next"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            disabled
            data-testid="button-generate-proposal"
          >
            <FileOutput className="w-4 h-4 mr-2" />
            Generate PDF
          </Button>
        )}
      </div>
    </div>
  );
}
