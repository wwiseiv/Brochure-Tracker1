import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HamburgerMenu } from "@/components/BottomNav";
import { AdviceExportToolbar } from "@/components/AdviceExportToolbar";
import {
  ArrowLeft,
  Target,
  Search,
  Handshake,
  Rocket,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Phone,
  Mail,
  FileText,
  Video,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Building2,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const phaseIcons = {
  Prospecting: Target,
  Discovery: Search,
  "Proposal & Close": Handshake,
  Onboarding: Rocket,
};

const phaseColors = {
  Prospecting: "bg-purple-500",
  Discovery: "bg-blue-500",
  "Proposal & Close": "bg-green-500",
  Onboarding: "bg-red-500",
};

interface Script {
  name: string;
  content: string;
  tips: string[];
}

interface SalesPhase {
  id: number;
  name: string;
  title: string;
  objective: string;
  keyActivities: string[];
  scripts: Script[];
  tips: string[];
  resources: { name: string; url: string; type: string }[];
}

interface ObjectionHandler {
  objection: string;
  responses: string[];
  tips: string[];
}

const salesProcessData = {
  contacts: {
    salesManager: { name: "Jason", email: "avar@pcbancard.com", phone: "(317) 750-9108", role: "Sales Manager" },
    newAgentSupport: { name: "Emma", email: "emma@pcbancard.com", phone: "(973) 768-2231", role: "New Agent Support" },
    it: { names: ["Kenny", "Erik"], email: "itdept@pcbancard.com", role: "IT and Equipment" },
    office: { names: ["Kristen", "Cori"], email: "office@pcbancard.com", role: "Office Manager/Applications" },
    proposals: { email: "proposals@pcbancard.com", turnaround: "24 hours" },
    mainOffice: { phone: "(973) 324-2251", hours: "8:30 AM - 5:00 PM EST" }
  },
  phases: [
    {
      id: 1,
      name: "Prospecting",
      title: "Prospect For the Appointment",
      objective: "Get the appointment scheduled",
      keyActivities: [
        "Drop in with Dual Pricing Flyer or Video Brochure",
        "Use Jason's drop-in-the-door pitch",
        "Set appointment for 15-minute presentation",
        "Enroll prospect in automated email series"
      ],
      scripts: [
        {
          name: "Jason's Drop-In-The-Door Pitch",
          content: `Hi my name is ___. I'm sorry I don't have time to stay long. I'm working with local business owners, helping them eliminate one of their biggest expenses. I just wanted to drop in and see if I could schedule about 15 minutes of your time either ___ at ___ o'clock or ___ at ____ o'clock, which one would work better for you?`,
          tips: [
            "Use alternative choice close for appointment time",
            "Create urgency by mentioning you're working with other businesses",
            "Keep it brief - 30 seconds maximum",
            "Always offer two specific appointment times"
          ]
        },
        {
          name: "Video Brochure Script",
          content: `Hello, my name is ___. I have just been helping some [industry] business owners in the [area] area. I apologize, but I can't stay long. I have [business A] and [business B] waiting for me to help them. I also understand that you are probably pretty busy. So I can respect your time and see if I can put hundreds, if not thousands back into your bottom line, I would like to leave this Video Brochure with you.

All I ask is that you take a quick look inside when you have 5 free minutes. Does that sound fair to you?

I'm going to be back in the area either (day) at (time) or (day) at (time). Which one is usually best for you so I can answer any questions you may have? I recommend watching the first short video, and if you want to learn more, there are 6 other videos with information. Here are the buttons.

Thank you. I will see you on ___ at ___.`,
          tips: [
            "Mention specific industry to build relevance",
            "Create social proof by naming other businesses",
            "Leave the video brochure for them to review",
            "Set specific callback appointment before leaving"
          ]
        }
      ],
      tips: [
        "Get out there and talk to merchants in person - this is the most important thing",
        "Use the 3-part email series between drop-in and discovery appointment",
        "Always leave with a specific appointment time"
      ],
      resources: [
        { name: "Dual Pricing Flyer", url: "https://pcbancard.com/wp-content/uploads/2025/08/Fillable-2025-Updated-Flyers-editable.pdf", type: "document" },
        { name: "Video Guide from Jason", url: "https://vimeo.com/1006339886", type: "video" },
        { name: "5-9-4-2-25 Formula", url: "https://vimeo.com/1018798318", type: "video" }
      ]
    },
    {
      id: 2,
      name: "Discovery",
      title: "The Appointment and the Presentation/Discovery",
      objective: "Understand merchant needs and collect processing statement",
      keyActivities: [
        "Ask discovery questions using questionnaires",
        "Walk through Pitch Book and Dual Pricing program",
        "Leave with one-month processing statement",
        "Set appointment to return with proposal"
      ],
      scripts: [
        {
          name: "Request Processing Statement",
          content: `What I would like to do is create a custom proposal for your business showing exactly how much money I can put back into your business each month. I'll do a side-by-side comparison of Traditional Processing, Surcharging and Dual Pricing, and I'll include any equipment costs as well. In order to do that I will need one-month processing statement.`,
          tips: [
            "Position as creating a CUSTOM proposal specifically for their business",
            "Emphasize the value of seeing all three options compared",
            "Only need ONE month of statements",
            "Set the follow-up appointment before leaving"
          ]
        }
      ],
      tips: [
        "Use Merchant Survey, POS Questionnaire, or Presentation Questionnaire",
        "Take detailed notes during discovery",
        "Have your Pitch Book handy to walk through Dual Pricing",
        "If merchant wants to close during presentation, call Jason or your mentor"
      ],
      resources: [
        { name: "Merchant Survey", url: "https://pcbancard.com/wp-content/uploads/2023/11/Merchant-Survey.pdf", type: "document" },
        { name: "POS Questionnaire", url: "https://pcbancard.com/wp-content/uploads/2023/12/POS-questionnaire.pdf", type: "document" },
        { name: "Presentation Questionnaire", url: "https://pcbancard.com/wp-content/uploads/2024/04/Presentation-Questionnaire.pdf", type: "document" },
        { name: "Pitch Book", url: "https://pcbancard.com/wp-content/uploads/2025/02/CANVA_proof_II-AZUWPOGGhlwe.pdf", type: "document" }
      ]
    },
    {
      id: 3,
      name: "Proposal & Close",
      title: "The Proposal and the Close",
      objective: "Present savings and close the deal",
      keyActivities: [
        "Walk through custom proposal showing savings",
        "Compare Traditional, Surcharging, and Dual Pricing",
        "Collect required documents",
        "Complete e-signature application"
      ],
      scripts: [
        {
          name: "Closing Script",
          content: `To get you up and running today, I will need a copy of your driver's license, business license, voided check, and processing statements.`,
          tips: [
            "Be direct and assumptive",
            "Have document checklist ready",
            "Text your mentor before the closing call",
            "Use the e-signature form for fastest processing"
          ]
        },
        {
          name: "Option Close",
          content: `Mr./Mrs. Merchant, which direction would you like to go? Like I said I can lower your rates and save you $50, $100 or we can eliminate your fees by implementing our Dual Pricing Program. Which program would you like to move forward with?`,
          tips: [
            "Give merchant two options - neither being NO",
            "Position as helping them choose the best option",
            "Always have traditional processing as backup"
          ]
        }
      ],
      tips: [
        "Text your mentor before closing call so they can assist",
        "Walk through the proposal showing exact savings",
        "Use the 2026 Dual Pricing e-signature form",
        "You will be paid your bonus once merchant processes $300"
      ],
      resources: [
        { name: "Quick Comparison Example", url: "https://pcbancard.com/wp-content/uploads/2023/05/Montelongo-CD-Dan-Santoli.pdf", type: "document" },
        { name: "Custom Proposal Video", url: "https://vimeo.com/1157121019", type: "video" },
        { name: "2026 Dual Pricing E-Signature", url: "https://forms.pcbancard.com/fill/U4r3mI8EQQ", type: "form" }
      ]
    },
    {
      id: 4,
      name: "Onboarding",
      title: "After the Sale",
      objective: "Successfully onboard merchant",
      keyActivities: [
        "Merchant receives welcome email from team@pcbancard.com",
        "Terminal shipped via 2-day FedEx",
        "IT call for first transaction setup",
        "PCI compliance completed within 30 days"
      ],
      scripts: [],
      tips: [
        "Terminal purchases billed 30 days after deployment",
        "Gateway/HotSauce billed immediately",
        "$64.95 Dual Pricing fee extracted first week of each month",
        "Annual $99 PCI fee only if they sign PCI form"
      ],
      resources: [
        { name: "iPOSpays Portal Setup", url: "https://pcbancard.activehosted.com/f/84", type: "portal" },
        { name: "Partner Training Portal", url: "https://pcbancard.com/pcb-partner-training/", type: "portal" }
      ]
    }
  ] as SalesPhase[],
  objectionHandling: [
    {
      objection: "I don't want to charge my customers more",
      responses: [
        `I can tell you that only about 1 out of every 50 business owners who implement this program find it's not the right fit. That's only about 2% of the time. If I'm personally willing to give you my guarantee and knowing you have a 98% chance of saving all that money, are you at least willing to give it a chance?`,
        `Mr./Mrs. Merchant, we have partnered with Darren Waller Foundation. A portion of that service fee goes back to your community. Now your customers understand that this fee is not just helping the business owner, but helping their local community.`,
        `Mr./Mrs. Merchant, VS/MC rates have gone up for 4 straight months now. You either raise all your prices or do Dual Pricing. What is going to be better?`
      ],
      tips: [
        "Acknowledge their concern genuinely",
        "Use the charity angle (Give Back Program)",
        "Focus on bottom line profit"
      ]
    },
    {
      objection: "I don't want to be the first/only one around here",
      responses: [
        `I can understand that. How about this: I get 5 other businesses in the area that have the same fear and have them agree to start the program all together, and then it becomes the norm? Would that make it easier?`,
        `Your competition runs the Dual Pricing program and you have to raise your prices, that doesn't work we can both agree, right?`
      ],
      tips: [
        "Offer to coordinate with other local businesses",
        "Frame it as becoming the norm in the area"
      ]
    },
    {
      objection: "I'm going to stay where I am for now",
      responses: [
        `I'm giving you my word – my personal guarantee – if this program negatively impacts your business in any way, I will drive out here the same day if needed. I'll swap that terminal, turn off that feature, or whatever I need to do. If I'm personally willing to give you my guarantee, are you at least willing to give it a chance?`
      ],
      tips: [
        "Offer a personal guarantee",
        "Make them say NO to you, not just the program",
        "Remind them there are no ETFs or long-term contracts"
      ]
    }
  ] as ObjectionHandler[],
  targetIndustries: [
    { category: "Automotive", industries: ["Auto repair/quick lube", "Brakes/tires/transmissions", "Used Auto Dealers", "Equipment rentals"] },
    { category: "Service-Based", industries: ["HVAC", "Plumbers", "Landscaping", "Painters", "Dry Cleaners"] },
    { category: "Food & Hospitality", industries: ["Pizza/delivery", "Food trucks", "Liquor Stores", "Smoke shops"] },
    { category: "Healthcare", industries: ["Chiropractors", "Dentists", "Veterinarians", "Optometrists", "Day spas"] },
    { category: "Retail & B2B", industries: ["Gun Dealers", "Pawn Shops", "Attorneys", "Daycares", "Funeral Homes"] }
  ],
  closingTips: [
    "Use references - have merchants call other merchants doing the program",
    "FOLLOW UP! 2-3 times is normal - change is hard for everyone",
    "Just get them to TRY the program - no ETFs, month-to-month",
    "Use the Option Close - give two choices, neither being NO",
    "GET OUT THERE AND TALK TO MERCHANTS IN PERSON"
  ]
};

export default function SalesProcessPage() {
  const { toast } = useToast();
  const [activePhase, setActivePhase] = useState<number>(1);
  const [expandedScripts, setExpandedScripts] = useState<Record<string, boolean>>({});
  const [expandedObjections, setExpandedObjections] = useState<Record<number, boolean>>({});

  const toggleScript = (scriptName: string) => {
    setExpandedScripts(prev => ({ ...prev, [scriptName]: !prev[scriptName] }));
  };

  const toggleObjection = (index: number) => {
    setExpandedObjections(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const currentPhase = salesProcessData.phases.find(p => p.id === activePhase);
  const PhaseIcon = currentPhase ? phaseIcons[currentPhase.name as keyof typeof phaseIcons] || Target : Target;
  const phaseColor = currentPhase ? phaseColors[currentPhase.name as keyof typeof phaseColors] || "bg-primary" : "bg-primary";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <HamburgerMenu />
            <Link href="/coach">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              <span className="font-semibold">2026 Sales Process</span>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-4xl mx-auto space-y-6">
        <Tabs defaultValue="phases" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="phases" data-testid="tab-phases">Phases</TabsTrigger>
            <TabsTrigger value="objections" data-testid="tab-objections">Objections</TabsTrigger>
            <TabsTrigger value="industries" data-testid="tab-industries">Industries</TabsTrigger>
            <TabsTrigger value="contacts" data-testid="tab-contacts">Contacts</TabsTrigger>
          </TabsList>

          <TabsContent value="phases" className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {salesProcessData.phases.map((phase) => {
                const Icon = phaseIcons[phase.name as keyof typeof phaseIcons] || Target;
                const color = phaseColors[phase.name as keyof typeof phaseColors] || "bg-primary";
                return (
                  <button
                    key={phase.id}
                    onClick={() => setActivePhase(phase.id)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      activePhase === phase.id
                        ? `border-current ${color.replace('bg-', 'text-')} bg-opacity-10`
                        : "border-border hover:border-primary/50"
                    }`}
                    data-testid={`phase-button-${phase.id}`}
                  >
                    <Icon className={`w-5 h-5 mx-auto mb-1 ${activePhase === phase.id ? color.replace('bg-', 'text-') : 'text-muted-foreground'}`} />
                    <div className="text-xs font-medium truncate">{phase.name}</div>
                  </button>
                );
              })}
            </div>

            {currentPhase && (
              <Card className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-lg ${phaseColor} flex items-center justify-center flex-shrink-0`}>
                    <PhaseIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-bold text-lg">{currentPhase.title}</h2>
                    <p className="text-sm text-muted-foreground">{currentPhase.objective}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Key Activities
                  </h3>
                  <ul className="space-y-1">
                    {currentPhase.keyActivities.map((activity, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{activity}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {currentPhase.scripts.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      Scripts
                    </h3>
                    <div className="space-y-2">
                      {currentPhase.scripts.map((script, i) => (
                        <Collapsible
                          key={i}
                          open={expandedScripts[script.name]}
                          onOpenChange={() => toggleScript(script.name)}
                        >
                          <Card className="p-3 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                            <CollapsibleTrigger className="w-full flex items-center justify-between">
                              <span className="font-medium text-sm">{script.name}</span>
                              {expandedScripts[script.name] ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-3 space-y-3">
                              <div className="relative">
                                <div className="bg-background p-3 rounded-lg border text-sm whitespace-pre-wrap">
                                  "{script.content}"
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(script.content)}
                                    data-testid={`copy-script-${i}`}
                                  >
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copy
                                  </Button>
                                  <AdviceExportToolbar
                                    content={`${script.name}\n\n"${script.content}"\n\nTips:\n${script.tips.map(t => `• ${t}`).join('\n')}`}
                                    title={script.name}
                                    subtitle="PCBancard Sales Script"
                                    variant="inline"
                                  />
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">Tips:</div>
                                <ul className="text-xs space-y-1">
                                  {script.tips.map((tip, j) => (
                                    <li key={j} className="flex items-start gap-1">
                                      <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                                      <span>{tip}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      ))}
                    </div>
                  </div>
                )}

                {currentPhase.tips.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      Pro Tips
                    </h3>
                    <ul className="space-y-1">
                      {currentPhase.tips.map((tip, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-amber-500">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentPhase.resources.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Resources
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {currentPhase.resources.map((resource, i) => (
                        <a
                          key={i}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent/50 transition-colors"
                        >
                          {resource.type === "video" ? (
                            <Video className="w-4 h-4 text-red-500" />
                          ) : (
                            <FileText className="w-4 h-4 text-blue-500" />
                          )}
                          <span className="text-xs font-medium truncate">{resource.name}</span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </TabsContent>

          <TabsContent value="objections" className="space-y-4">
            <Card className="p-4">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Common Objections & Responses
              </h2>
              <div className="space-y-3">
                {salesProcessData.objectionHandling.map((obj, i) => (
                  <Collapsible
                    key={i}
                    open={expandedObjections[i]}
                    onOpenChange={() => toggleObjection(i)}
                  >
                    <Card className="p-3 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                      <CollapsibleTrigger className="w-full flex items-start justify-between gap-2">
                        <span className="font-medium text-sm text-left">"{obj.objection}"</span>
                        {expandedObjections[i] ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3 space-y-3">
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-green-600">Responses:</div>
                          {obj.responses.map((response, j) => (
                            <div key={j} className="bg-background p-3 rounded-lg border text-sm">
                              "{response}"
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2"
                                onClick={() => copyToClipboard(response)}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Tips:</div>
                          <ul className="text-xs space-y-1">
                            {obj.tips.map((tip, j) => (
                              <li key={j} className="flex items-start gap-1">
                                <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Top Closing Tips
              </h3>
              <ul className="space-y-2">
                {salesProcessData.closingTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </TabsContent>

          <TabsContent value="industries" className="space-y-4">
            <Card className="p-4">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Target Industries for P Series Terminal
              </h2>
              <div className="space-y-4">
                {salesProcessData.targetIndustries.map((category, i) => (
                  <div key={i}>
                    <h3 className="font-semibold text-sm mb-2">{category.category}</h3>
                    <div className="flex flex-wrap gap-1">
                      {category.industries.map((industry, j) => (
                        <Badge key={j} variant="secondary" className="text-xs">
                          {industry}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4">
            <Card className="p-4">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Key Contacts
              </h2>
              <div className="space-y-3">
                {Object.entries(salesProcessData.contacts).map(([key, contact]) => (
                  <Card key={key} className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">
                          {'name' in contact ? contact.name : 'names' in contact ? contact.names.join(' & ') : ''}
                        </div>
                        <div className="text-xs text-muted-foreground">{'role' in contact ? contact.role : ''}</div>
                      </div>
                      <div className="flex gap-2">
                        {'phone' in contact && contact.phone && (
                          <a href={`tel:${contact.phone}`}>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <Phone className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                        {'email' in contact && (
                          <a href={`mailto:${contact.email}`}>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <Mail className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                    {'email' in contact && (
                      <div className="text-xs text-muted-foreground mt-1">{contact.email}</div>
                    )}
                    {'phone' in contact && contact.phone && (
                      <div className="text-xs text-muted-foreground">{contact.phone}</div>
                    )}
                    {'turnaround' in contact && (
                      <Badge variant="outline" className="mt-2 text-xs">{contact.turnaround} turnaround</Badge>
                    )}
                    {'hours' in contact && (
                      <div className="text-xs text-muted-foreground mt-1">Hours: {contact.hours}</div>
                    )}
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
