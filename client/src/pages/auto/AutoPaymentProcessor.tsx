import { useState } from "react";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CreditCard,
  Wifi,
  WifiOff,
  Shield,
  Zap,
  Settings,
  Check,
  Landmark,
  Store,
  RefreshCw,
  Smartphone,
  Globe,
} from "lucide-react";

interface Processor {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: typeof CreditCard;
  connected: boolean;
}

const PROCESSORS: Processor[] = [
  {
    id: "fluidpay",
    name: "FluidPay",
    category: "Payment Gateway",
    description: "Full-service payment gateway with tokenization, recurring billing, and real-time reporting for card-present and card-not-present transactions.",
    icon: Zap,
    connected: true,
  },
  {
    id: "square",
    name: "Square Terminal",
    category: "POS & Payments",
    description: "All-in-one point-of-sale terminal with built-in card reader and receipt printer for in-person payments.",
    icon: Store,
    connected: false,
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Online Payments",
    description: "Industry-leading online payment processing with support for 135+ currencies and advanced fraud protection.",
    icon: Globe,
    connected: false,
  },
  {
    id: "clover",
    name: "Clover",
    category: "POS System",
    description: "Complete point-of-sale system with inventory management, employee tracking, and customer engagement tools.",
    icon: Smartphone,
    connected: false,
  },
  {
    id: "paysimple",
    name: "PaySimple",
    category: "Recurring Payments",
    description: "Automated billing and recurring payment platform designed for service-based businesses.",
    icon: RefreshCw,
    connected: false,
  },
  {
    id: "heartland",
    name: "Heartland",
    category: "Integrated Payments",
    description: "End-to-end payment processing with integrated payroll, lending, and customer engagement solutions.",
    icon: Shield,
    connected: false,
  },
];

export default function AutoPaymentProcessor() {
  const [connected, setConnected] = useState(true);
  const [autoCapture, setAutoCapture] = useState(true);
  const [sendReceipts, setSendReceipts] = useState(true);
  const [defaultTerminal, setDefaultTerminal] = useState("terminal-1");
  const [merchantId, setMerchantId] = useState("MID-4820-9716");

  const connectedProcessor = PROCESSORS.find((p) => p.connected)!;
  const availableProcessors = PROCESSORS.filter((p) => !p.connected);

  const handleDisconnect = () => {
    setConnected(false);
  };

  const handleReconnect = () => {
    setConnected(true);
  };

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-500 flex items-center justify-center shadow-md">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" data-testid="text-payment-title">
                Payment Processor
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Configure your payment gateway for processing card transactions
              </p>
            </div>
          </div>

          <Badge
            variant={connected ? "default" : "destructive"}
            className={
              connected
                ? "bg-green-500/10 text-green-500 no-default-hover-elevate no-default-active-elevate"
                : "no-default-hover-elevate no-default-active-elevate"
            }
            data-testid="status-processor-connection"
          >
            <span
              className={`w-2 h-2 rounded-full mr-2 ${connected ? "bg-green-500" : "bg-destructive"}`}
            />
            {connected ? "CONNECTED" : "DISCONNECTED"}
          </Badge>
        </div>

        <Card data-testid="card-connected-processor">
          <CardHeader>
            <CardTitle className="text-base">Currently Connected</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                  <connectedProcessor.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-base" data-testid="text-connected-name">
                      {connectedProcessor.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs no-default-hover-elevate no-default-active-elevate"
                      data-testid="badge-processor-category"
                    >
                      {connectedProcessor.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {connectedProcessor.description}
                  </p>
                </div>
              </div>
              {connected ? (
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  data-testid="button-disconnect-processor"
                >
                  <WifiOff className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="default"
                  onClick={handleReconnect}
                  data-testid="button-reconnect-processor"
                >
                  <Wifi className="h-4 w-4 mr-2" />
                  Reconnect
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  API Key
                </div>
                <div className="text-sm font-mono tabular-nums" data-testid="text-api-key">
                  fp_live_••••••••••3a7f
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Connection Status
                </div>
                <div className="flex items-center gap-1.5" data-testid="text-connection-status">
                  {connected ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-sm text-green-500 font-medium">Active</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-sm text-destructive font-medium">Disconnected</span>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Last Transaction
                </div>
                <div className="text-sm text-muted-foreground" data-testid="text-last-transaction">
                  Feb 8, 2026 at 3:42 PM
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-base font-bold" data-testid="text-available-title">
            Available Processors
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableProcessors.map((processor) => (
              <Card
                key={processor.id}
                className="hover-elevate"
                data-testid={`card-processor-${processor.id}`}
              >
                <CardContent className="pt-5 pb-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <processor.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-bold text-sm" data-testid={`text-name-${processor.id}`}>
                          {processor.name}
                        </div>
                        <div className="text-xs text-muted-foreground">{processor.category}</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {processor.description}
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          disabled
                          data-testid={`button-connect-${processor.id}`}
                        >
                          Coming Soon
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{processor.name} integration coming soon</p>
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card data-testid="card-payment-settings">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Payment Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm font-medium">Auto-capture payments</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automatically capture authorized payments without manual review
                </p>
              </div>
              <Switch
                checked={autoCapture}
                onCheckedChange={setAutoCapture}
                data-testid="switch-auto-capture"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm font-medium">Send receipts automatically</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Email payment receipts to customers after each transaction
                </p>
              </div>
              <Switch
                checked={sendReceipts}
                onCheckedChange={setSendReceipts}
                data-testid="switch-send-receipts"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Default payment terminal</Label>
              <Select value={defaultTerminal} onValueChange={setDefaultTerminal}>
                <SelectTrigger data-testid="select-default-terminal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="terminal-1">Terminal 1 - Front Counter</SelectItem>
                  <SelectItem value="terminal-2">Terminal 2 - Bay Area</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Merchant ID</Label>
              <Input
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                data-testid="input-merchant-id"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AutoLayout>
  );
}
